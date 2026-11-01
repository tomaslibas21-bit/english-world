// Song 71 "Fill It Up" (part 2) → Puerto Colibrí: "Lleno, por favor"
// Gasolinera El Faro. In Mexico nobody pumps their own gas: an attendant (el despachador, here Doña Chela) comes to
// the car, asks "¿Cuánto le pongo?" ("Lleno" or "Quinientos de magna"; magna = regular, the green handle, premium the
// red one), shows that the pump starts at zero, may offer to check the oil and tires or clean the windshield (free;
// people tip), and you pay her at the car when she's done: cash, or a card on the terminal she brings ("¿Crédito o
// débito?", the PIN is the NIP), and a "ticket" for the receipt (the factura is made online from it).
// Kept from the English: steps order, amount, extras, pay, debit, receipt, pump_on, trouble, trouble_help, anything;
// the car-trouble twist. Changed by the brief: no pump numbers and no prepaying inside, so the English pump,
// fill_pay, leave and after steps and the ZIP-code problem are gone; the pump question became the fuel (grade); the
// out-of-order twist became the classic scam twist, a pump that doesn't start at zero (zeros); snacks became the
// attendant's checks (check_order); new: the tip.
// Mexican-only words have a neutral twin (ahorita, checar, ticket, carro, vulcanizadora).
//
// NEEDS: npcs.ts: dot is "Cajera de la gasolinera / Gas station cashier"; in this scene she is the attendant at the
//   pump: "Despachadora / Gas station attendant".
// NEEDS: locations.ts: gas-station is an "interior"; the conversation happens outside, at the pump.

import type { Ctx, EntityDef, SituationDef, Tip } from "@/content/types";
import { ent, t } from "@/content/dsl";

// ---------------------------------------------------------------------------

const GRADES: EntityDef[] = [
  ent("magna", "magna", "regular", "f", {
    art: "", forms: ["la magna", "regular", "la regular", "verde", "la verde", "normal", "la normal", "gasolina normal", "gasolina regular", "la gasolina normal",
      "sin plomo", "la sin plomo", "la barata", "la mas barata", "la economica", "magna verde", "mangna"], attrs: { nat: "regular" } }),
  ent("premium", "premium", "premium", "f", {
    art: "", forms: ["la premium", "roja", "la roja", "super", "la super", "la cara", "gasolina premium", "la gasolina premium", "premiun", "primium"], attrs: { nat: "premium" } }),
  ent("diesel", "diésel", "diesel", "m", { art: "", forms: ["diesel", "el diesel", "disel", "el disel", "gasoil", "gasoleo", "el gasoleo"], attrs: { nat: "diesel" } }),
];

const FILL_COSTS = [78640, 86150, 93780]; // a full tank, in cents of a peso
const LAST_SALE = 15000; // what the pump shows in the zeros twist
const MAX_AMOUNT = 150000; // more than a tank takes
const RESULT: Record<string, string> = { oil: "res_oil", water: "res_water", tires: "res_tires", glass: "res_glass" };

// ---------------------------------------------------------------------------
// State helpers

/** What she charges: a full tank, or the amount (the pump stops when the tank is full). */
const due = (c: Ctx): number => (c.s.fill ? c.s.fillCost : Math.min(c.s.amount ?? 0, c.s.fillCost)) as number;
const fullTank = (c: Ctx) => !!c.s.fill || (c.s.amount ?? 0) >= c.s.fillCost;

const TIPS: Record<string, Tip> = {
  tu_staff: { key: "tu_staff", lt: "Understood! With the attendant, usted is more polite: “Llénelo”, “¿Me revisa el aceite?” (llénalo / revísame is for friends).", better: "Llénelo, por favor." },
  zeros: { key: "zeros", lt: "Before she starts, look at the pump: it should show $0.00. If it doesn't, say “No está en ceros”.", better: "Espere, no está en ceros." },
};

// Automatic answers the simulation uses when Chela asks an optional question.
const AUTO: Record<string, string> = {
  order: "Lleno, por favor", grade: "Magna", amount: "Quinientos", zeros: "Espere, no está en ceros", pump_on: "Sí, gracias",
  extras: "No, gracias", pay: "Con tarjeta", debit: "De crédito", receipt: "No, gracias", fill_offer: "Sí, lleno",
  trouble: "Mi carro no arranca", trouble_help: "¿Me puede pasar corriente?", anything: "No, es todo, gracias",
};
const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// ---------------------------------------------------------------------------

export const gas: SituationDef = {
  id: "s71b-gas",
  song: 71,
  songTitle: "Fill It Up",
  title: { en: "Lleno, por favor", lt: "Fill it up, please" },
  topic: { en: "En la gasolinera", lt: "At the gas station" },
  chapter: 6,
  order: 4,
  location: "gas-station",
  npc: "dot",
  goal: "Tell the attendant how much gas you want and which kind, make sure the pump starts at zero, and pay her at the car.",
  intro: "Gasolinera El Faro. In Mexico an attendant fills the tank for you: say “Lleno” (full) or an amount in pesos, and magna (regular) or premium. Check the pump starts at zero, and a small tip is usual.",
  entities: { grade: GRADES },

  grammar: {
    macros: {
      gas: "(gasolina | gas | combustible | nafta)",
      pon: "(pongale | ponga | pongame | me pone | me puede poner | me podria poner | ponme | ponle #tip:tu_staff | me pones #tip:tu_staff | cargue | carguele | me carga | me puede cargar | echele | echeme | me echa | quiero | quisiera | necesito | deme | me da | voy a querer)",
      llen: "(llene | llenelo | llenemelo | lleneme | llenela | llenalo #tip:tu_staff | llename #tip:tu_staff | llenamelo #tip:tu_staff | me lo llena | lo llena | me lo puede llenar | me lo podria llenar | me llena | me puede llenar)",
      tanque: "(el tanque | tanque | el deposito | deposito | el carro | mi carro)",
      car: "(carro | auto | vehiculo | camioneta)",
      tire: "(llanta | rueda | neumatico | goma)",
      zero: "(ceros | cero)",
      wait: "(espere | espereme | un momento | momento | alto | oiga | no espere)",
      svcx: "(el agua | el aceite | aceite | las llantas | llantas | el parabrisas | parabrisas | los vidrios)",
      svc: "(el agua #water | el agua del radiador #water | el anticongelante #water | el aceite #oil | aceite #oil | el nivel del aceite #oil | las llantas #tires | llantas #tires | la presion de las llantas #tires | el aire de las llantas #tires | los neumaticos #tires | las ruedas #tires | el parabrisas #glass | parabrisas #glass | los vidrios #glass | el vidrio #glass)",
      rev: "(reviseme | revise | me revisa | me puede revisar | me podria revisar | cheque | cheqeme | chequeme | me checa | me puede checar | revisame #tip:tu_staff | checame #tip:tu_staff | me revisas #tip:tu_staff | me checas #tip:tu_staff | puede revisar | podria revisar)",
      clean: "(limpieme | limpie | me limpia | me puede limpiar | me podria limpiar | limpiame #tip:tu_staff | me limpias #tip:tu_staff)",
    },
  },

  intents: {
    fill: { patterns: [
      "lleno #h:fill", "lleno de {grade} #h:fill_grade", "lleno con {grade}", "(tanque lleno | el tanque lleno) [de {grade}]", "(me lo llena | me lo puede llenar) [de {grade}] #h:fill_ask",
      "@llen [@tanque] [(de | con) {grade}]", "lleno [de @gas]", "(quiero | quisiera | necesito | vengo a) llenar [@tanque] [de {grade}]", "@pon (lleno | el tanque lleno | tanque lleno) [de {grade}]",
      "{grade} [y] lleno", "lleno [el] (tanque | deposito) [de {grade}]", "mejor (lleno | llenelo | llenemelo | lleno el tanque) [de {grade}]",
      "hasta (arriba | que se llene) [de {grade}]", "lleno lleno",
    ] },
    // "No lo llene": not a full tank (she asks how much)
    fill_no: { patterns: ["no (lo | me lo) llene", "no (quiero | necesito) [el] (tanque)? lleno", "lleno no [gracias]", "no (quiero | necesito) llenarlo"] },
    prepay: { patterns: [
      "{price} de {grade} #h:prepay", "{price} de @gas", "@pon {price} [de ({grade} | @gas)] #h:put",
      "(quiero | quisiera | necesito) (poner | cargar | echar | ponerle | cargarle | echarle) {price} [de ({grade} | @gas)]",
      "{grade} {price}", "de {grade} {price}", "{price} en {grade}",
    ] },
    // a bare amount answers "¿Cuánto le pongo?" only (rule 2)
    amount_ctx: { patterns: ["{price}", "(como | unos | mas o menos) {price}", "(nada mas | solo | nomas | solamente) {price}", "{price} (nada mas | esta bien | estaria bien)"] },
    // "Mejor quinientos": a new amount before she's done
    amount_change_ctx: { patterns: [
      "mejor {price} [de {grade}]", "mejor (pongale | ponga | cargue | carguele | echele) {price} [de {grade}]", "(mejor | ya) (nada mas | solo | nomas) {price}",
      "(cambie | cambielo | mejor que sean | que sean) {price}", "(lleno | el lleno) no [mejor] [nada mas | solo | nomas] {price}", "no (lleno | lo llene) [nada mas | solo | nomas | sino | mejor] {price}",
      "no (quiero | necesito) (lleno | el tanque lleno | tanque lleno | llenarlo) [quiero | nada mas | solo | nomas | sino | mejor] {price}",
      "{price} mejor", "{bad:price} no [sino | mejor] {price}", "no {bad:price} (sino | mejor)? {price}",
    ] },
    // "Medio tanque": about $400 (she says so)
    half_tank: { patterns: ["medio tanque [de {grade}] #h:half", "(la | hasta la) mitad [del tanque] [de {grade}]", "@pon medio tanque [de {grade}]", "{grade} medio tanque"] },
    want_gas: { patterns: ["(quiero | necesito | quisiera) @gas #h:want_gas", "(vengo a | quiero | necesito) (cargar | echar | poner) @gas", "@gas", "(me | le) (pone | puede poner | echa) @gas"] },
    grade_ans: { patterns: [
      "{grade} #h:grade_pick", "de {grade} #h:grade_de", "(es | lleva | usa | le va | quiero | le pone | pongale | ponga | echele | carguele | me pone) [de] {grade}",
      "(la que sea | cualquiera | la que usted diga | lo que sea | la que me recomiende) #any", "(mi | el | este) @car (usa | lleva | es de | necesita) {grade}",
      "{grade} (esta bien | estaria bien)", "{bad:grade} no [sino | mejor] {grade}", "no {bad:grade} (sino | mejor) {grade}", "no {bad:grade} no [sino | mejor] {grade}",
      "no (le ponga | me ponga | ponga | quiero) {bad:grade} [(ponga | pongale | quiero | mejor | sino)] {grade}",
    ] },
    // "No quiero premium": never premium
    grade_no: { patterns: ["no (quiero | me ponga | le ponga | ponga | pongale) {grade}", "{grade} no [gracias]", "no (uso | lleva | usa) {grade}"] },
    grade_q: { patterns: [
      "(cual | que) (me recomienda | le pongo | me conviene | es mejor) #h:q_grade", "(cual | que gasolina) (lleva | usa | le pongo a | necesita) (un | este | mi | el) @car [rentado]",
      "(cual | que) es la diferencia #diff", "que diferencia hay #diff", "cual es (mas barata | la mas barata | mas cara | la mas cara) #diff", "cual es (la magna | la premium | la verde | la roja) #which", "(tienen | hay | venden) diesel #diesel",
      "que (gasolina | tipo de gasolina) (lleva | usa | le pongo)", "(la magna | magna) (esta bien | sirve) para (un | mi | el) @car [rentado]",
      "(es | mi @car es | es un @car) rentado [que le pongo | cual le pongo]",
    ] },
    gas_price_q: { patterns: [
      "a como (esta | anda | se vende) (la {grade} | la gasolina | el litro [de {grade}]) #h:q_price", "cuanto (cuesta | vale | esta | sale | es) (el litro [de {grade}] | la gasolina | la {grade} | el litro de gasolina)",
      "cuanto (cuesta | vale | esta | sale) el galon #galon", "a como (esta | anda) el galon #galon",
      "cuanto (cuesta | sale | es | seria) (llenarlo | llenar el tanque | el tanque lleno | un tanque lleno | llenar) #fillq", "(que | cual es el) precio (tiene)? (la gasolina | el litro | la {grade})",
    ] },
    pay_pump_q: { patterns: ["(donde | a quien) (pago | le pago | se paga) #h:q_where_pay", "(pago | se paga | tengo que pagar | le pago) (adentro | en la caja | en la tienda | aqui | a usted | ahora | antes | despues | al final)", "le pago a usted", "(le pago a usted | pago aqui) o (adentro | en la caja)", "(donde | en donde) (esta | queda) la caja"] },
    tip_q: { patterns: ["(hay que | se) (deja | dejar | da | dar) propina", "cuanto (se deja | se da | le dejo | le doy) (de)? propina", "(se acostumbra | es normal) (la | dar)? propina"] },
    // "¿Cuánto es?": the total, or (at her offer) whether the checks cost anything
    cost_q: { patterns: ["cuanto (es | cuesta | le debo | seria | va a ser | me cobra) [eso | el servicio]", "(es | eso es) gratis #free", "(se paga | se cobra | cobra) aparte #free", "cuesta algo #free", "(tiene | hay que pagar) (costo | algo) #free"] },
    no_change: { patterns: ["no (tengo | traigo) (cambio | feria | billetes chicos | sencillo)", "(solo | nada mas | nomas) (tengo | traigo) (billetes de)? {price}", "(tiene | trae) cambio de {price}", "(tiene | trae) cambio"] },
    far_q: { patterns: ["(esta | queda) (lejos | cerca)", "(esta | queda) (lejos | cerca) (la carretera #road | el taller | la vulcanizadora | el cajero)"] },
    // "No, no está todo bien": she asks what happened
    trouble_vague: { patterns: ["(tengo | hay) un problema [con (mi | el) @car]", "algo (anda mal | pasa | esta mal) con (mi | el) @car", "(mi | el) @car no (esta | anda) bien", "algo (anda | esta) mal"] },
    zeros_q: { patterns: ["(esta | ya esta | la bomba esta) en @zero #h:q_zeros", "(empezo | empieza | arranco) en @zero", "(la puso | ya la puso) en @zero", "(me deja | puedo) ver la bomba", "esta en @zero la bomba"] },
    // "No está en ceros": the pump still shows the last sale (the twist)
    zeros_ctx: { patterns: [
      "[@wait] [la bomba] no (esta | estaba) en @zero #h:zeros_no", "[@wait] no (empezo | empieza | arranco | esta puesta) en @zero", "[@wait] no la (puso | pusieron | ha puesto) en @zero",
      "(puede | me puede | podria | me podria) (poner | dejar | regresar) (la bomba | la) en @zero #h:zeros_reset", "(pongala | ponga la bomba | regresela | pongalo) en @zero",
      "[@wait] (ya | la bomba | la bomba ya) marca {price}", "[@wait] (marca | dice | esta marcando) {price}", "falta (ponerla | poner la bomba) en @zero",
      "por que marca {price}", "[@wait] (ya tiene | tiene) {price}",
    ] },
    // a bare "¡Espere!" when she starts (the twist only)
    zeros_wait_ctx: { patterns: ["@wait", "[no] espere [por favor] [un momento]"] },
    check_order: { patterns: [
      "[si] @rev @svc [y @svc] #h:check_yes", "[si] @clean (el parabrisas | los vidrios | el vidrio) #glass #h:check_glass", "(nada mas | solo | nomas | solamente) @svc [y @svc] #h:check_only",
      "(me | le) (pone | puede poner | pones #tip:tu_staff) aire (a las llantas | a la llanta) #tires", "(pongale | ponga) aire (a las llantas | a la llanta) #tires",
      "(quiero | necesito) que (me | le) (revise | cheque) @svc", "[si] (revise | cheque) todo #all", "si (por favor)? @svc [y @svc]",
      "[si] (limpielo | limpiemelo | limpie el vidrio) #glass", "[si] (reviselo | reviselos | reviselas | revisemelo | chequelo | chequelas | reviseme | chequeme) #offer",
      "@svc si [pero] @svcx no [gracias]", "@svcx no [pero] @svc si",
    ] },
    // a bare "Las llantas" answers the offer only
    check_ctx: { patterns: ["@svc [y @svc]", "todo #all", "(las dos cosas | ambas cosas) #all"] },
    check_no: { patterns: [
      "no (me | le)? (revise | cheque | limpie) @svc", "@svc no [gracias]", "no (hace falta | es necesario) (revisar | checar | limpiar) @svc",
      "@svc (esta | estan) bien [gracias]", "no (quiero | necesito) que (me | le) (revise | cheque | limpie) @svc", "no (me | le)? (revise | cheque) nada",
      "no (hace falta | es necesario) (revisar | checar | limpiar) nada",
      // "Sí, pero el aceite no": the rest of her offer
      "si [pero] no @svc #but", "si [pero] @svc no #but",
    ] },
    more_no: { patterns: [
      "(es | eso es | eso seria | seria) todo [por ahora] #h:more_no", "nada mas", "(asi | asi esta) bien #h:more_fine", "no gracias asi esta bien",
      "(solo | nada mas | nomas) (la gasolina | gasolina)", "no (necesito | quiero) nada [mas]", "(estoy | todo) bien", "todo (bien | esta bien) gracias",
      "por ahora es todo", "ya (es todo | con eso)", "con eso (es suficiente | esta bien)", "nada [gracias]", "no pasa nada", "no (tengo | hay) [ningun] problema", "no (quiero | la quiero) molestar[la]",
    ] },
    more_no_ctx: { patterns: ["no hace falta", "no es necesario", "(asi | asi esta) bien no hace falta", "ya esta", "no (necesito | quiero) (ayuda | una grua | grua)"] },
    coffee_where: { patterns: ["(donde | en donde) (hay | venden | puedo comprar | compro) (cafe | algo de comer | agua | refrescos | botanas)", "(venden | tienen | hay) (cafe | algo de comer | agua | refrescos | botanas)"] },
    restroom: { patterns: [
      "(donde | en donde) (esta | queda | hay) [el | un] (bano | sanitario | servicio | servicios | aseo | lavabo) #h:q_restroom", "(tienen | hay) (bano | banos | sanitarios | servicio) [aqui]",
      "(puedo | me deja) (usar | pasar a) el (bano | sanitario)", "(necesito | quiero) (ir al bano | usar el bano)", "(el | un) bano",
    ] },
    directions: { patterns: [
      "como (llego | salgo | me voy) a la (carretera | autopista | federal) #h:q_road", "(por donde | como) (llego | salgo | me voy | voy | se va) (a | para | hacia) (la carretera | la autopista | tulum | playa del carmen | playa | cancun | el aeropuerto)",
      "(para | hacia) (donde | que lado) (queda | esta | es) (tulum | cancun | la carretera | playa del carmen | el aeropuerto)", "(donde | por donde) (esta | queda) la carretera",
      "(como | por donde) salgo [a la carretera]", "voy (a | para) (tulum | cancun | playa del carmen) (por donde | como) (me voy | llego | salgo)",
    ] },
    air: { patterns: [
      "(donde | en donde) (pongo | puedo poner | hay) aire #h:q_air", "(me | le) (pone | puede poner | podria poner) aire [a las llantas | a la llanta | en las llantas]",
      "necesito (aire | ponerle aire) [a las llantas | en las llantas]", "(tienen | hay) aire [para las llantas]",
    ] },
    atm: { patterns: ["(hay | tienen) [un] cajero [automatico] [aqui | por aqui | cerca] #h:q_atm", "(donde | en donde) (hay | esta) (un | el) cajero", "(donde | en donde) (puedo | se puede) sacar dinero"] },
    trouble: { patterns: [
      "(mi | el) @car no (arranca | prende | enciende | quiere arrancar | quiere prender) #h:car_wont_start", "no (arranca | prende | quiere arrancar | enciende) [el @car | mi @car]",
      "(tengo | traigo) una @tire (ponchada | pinchada | baja | desinflada) #flat #h:flat_tire", "se me (poncho | pincho | bajo | desinflo) una @tire #flat",
      "(tengo | traigo) un (pinchazo | ponchazo) #flat", "(mi | la | una) @tire (esta)? (ponchada | pinchada | baja | desinflada) #flat",
      "(se me descargo | esta descargada | se murio | se me murio) la bateria #battery", "(creo que)? (es | fue) la bateria #battery",
      // anything else: she sends the learner to the mechanic
      "(mi | el) @car (hace un ruido raro | hace un ruido | se descompuso | se calienta | se esta calentando | tira aceite) #other", "(sale | le sale) humo [del motor] #other",
    ] },
    ask_mechanic: { patterns: [
      "(hay | conoce) (un | algun | una)? (taller [mecanico] | mecanico | vulcanizadora #flat | llantera #flat) [cerca | por aqui | aqui cerca] #h:q_mechanic",
      "(donde | en donde) (hay | esta | queda) (un | el | la | una)? (taller [mecanico] | mecanico | vulcanizadora #flat | llantera #flat)",
      "necesito (un | una)? (mecanico | taller | vulcanizadora #flat)", "(donde | en donde) (me | la) (arreglan | pueden arreglar) [la @tire] #flat",
    ] },
    call_help: { patterns: [
      "(me | nos) (puede | podria) pasar corriente #h:help_jump", "(me | nos) (puede | podria) ayudar", "(puede | podria) (llamar | hablarle | llamarle) a (una grua #grua | la grua #grua | alguien | un mecanico) #h:tow",
      "(necesito | quiero) (una grua #grua | ayuda)", "(tiene | tienen) cables", "(me | le) (pasa | pasan) corriente", "(me | nos) (ayuda | ayudan)",
    ] },
    receipt_ask: { patterns: [
      "(me | nos) (da | puede dar | podria dar | das #tip:tu_staff) (el | mi | su | un)? (ticket | recibo | comprobante) #h:receipt", "(me | nos) (da | puede dar | podria dar | hace) [una] factura #factura #h:factura",
      "(necesito | quiero | quisiera) (el | mi | un)? (ticket | recibo | comprobante)", "(necesito | quiero | quisiera) [una] factura #factura",
      "(el | mi)? (ticket | recibo | comprobante)", "(puedo | se puede) (pedir | sacar) factura #factura", "(dan | hacen) factura #factura", "[y] [una] factura #factura",
    ] },
    // "No, no lo necesito" (to "¿Le doy su ticket?")
    receipt_no_ctx: { patterns: ["no (lo | la) (necesito | quiero)", "no (hace falta | es necesario)"] },
    no_receipt: { patterns: ["no (necesito | quiero) [el | un | mi] (ticket | recibo | comprobante)", "sin (ticket | recibo | comprobante)", "no (necesito | quiero) factura", "no me (de | da) (el | un | mi)? (ticket | recibo)", "(ticket | recibo) no [gracias]"] },
    pay_card: { patterns: [
      "(puedo | se puede) pagar con tarjeta #h:pay_card", "con tarjeta #h:pay_card_short", "tarjeta", "(acepta | aceptan | toman) tarjeta #h:take_cards",
      "(pago | voy a pagar | le pago) con tarjeta", "(pago | voy a pagar | le pago | con) [una] tarjeta de (credito #credit | debito #debit)", "con (tarjeta)? de (credito #credit | debito #debit)", "con (la | mi) tarjeta", "aqui (tiene | esta) mi tarjeta",
      "(puedo | se puede) pagar con (el | mi)? (celular | telefono)", "(pago | le pago) con (el | mi) (celular | telefono)", "con (el | mi) celular",
      "(visa | mastercard | american express | amex)", "(me cobra | cobrese | me puede cobrar | cobreme) con tarjeta", "(acepta | aceptan | puedo pagar con) (apple pay | google pay)",
    ] },
    // "No traigo efectivo": so it's the card (never read as "efectivo")
    no_cash: { patterns: ["no (tengo | traigo) [suficiente] efectivo", "no (tengo | traigo) efectivo (acepta | aceptan | puedo pagar con) tarjeta", "sin efectivo", "no (tengo | traigo) (cash | dinero en efectivo | pesos)", "no puedo pagar en efectivo"] },
    // "No tengo tarjeta": so it's cash (never read as "tarjeta")
    no_card: { patterns: ["no (tengo | traigo) tarjeta", "no (pago | puedo pagar | quiero pagar) con tarjeta", "sin tarjeta"] },
    pay_cash: { patterns: ["[puedo] pagar en efectivo", "en efectivo #h:pay_cash", "efectivo", "(pago | voy a pagar | le pago) en efectivo", "con efectivo", "(tarjeta | con tarjeta) no [mejor] en efectivo"] },
    pay_dollars: { patterns: ["(acepta | aceptan | toman | reciben) (dolares | dolar) #h:q_dollars", "(puedo | se puede) pagar (en | con) dolares", "(tengo | traigo) (solo | nada mas)? dolares"] },
    here_you_go: { patterns: [
      "aqui tiene #h:here_you_go", "aqui esta", "tenga", "tome", "(aqui tiene | tenga | le doy | aqui le doy) [son] {price}", "aqui (tiene | estan) (los | sus) {price}",
      "(le pago | pago) con (un billete de)? {price}",
    ] },
    tip: { patterns: [
      "(esto | esta) es para usted #h:tip_for_you", "(y | aqui) (esto | esta) es para usted", "es para usted", "para su refresco #h:tip_refresco", "(es | esto es) para su (refresco | chesco | cafe)",
      "quedese con el cambio #h:keep_change", "el cambio es para usted", "(le dejo | aqui le dejo | tenga | le doy) {price} de propina #h:tip_amount",
      "(su | una | aqui esta su | tenga su | es su) propina", "(asi esta bien | asi esta) quedese con el cambio", "no me de [el] cambio", "quedate con el cambio #tip:tu_staff",
      "gracias por (limpiar | revisar | checar) @svcx [y] (esto | esta) es para usted",
    ] },
    credit_debit: { patterns: [
      "[de] credito #credit #h:credit", "[de] debito #debit #h:debit", "(es | es una | es tarjeta | tarjeta) de (credito #credit | debito #debit)",
      "[es] (visa | mastercard | una visa | una mastercard) de (credito #credit | debito #debit)", "no es de credito [es] de debito #debit", "no es de debito [es] de credito #credit",
      // "No es de crédito" / "No, es de crédito": the comma is lost, so she asks again (rule 10)
      "no es de (credito | debito) #amb",
    ] },
    ok_ack: { patterns: ["ya (vi | lo vi | la vi) #h:ok_seen", "(ok | va | sale | orale | perfecto | muy bien | esta bien | de acuerdo | claro | si) ya (vi | lo vi | la vi)"] },
  },

  lines: {
    greet: [
      t("¡Buenas | tardes! | ¿Cuánto | le | pongo?", "Good | afternoon! | How much | (for) you | I-put?", "Good afternoon! How much should I put in?",
        { flags: { 3: "le: “for you” (usted)." } }),
      t("¡Buenas! | ¿Cuánto | le | cargo?", "Hi! | How much | (for) you | I-load?", "Hi! How much do you want?",
        { flags: { 3: "cargar gasolina = to fill up (literally “to load”)." } }),
      t("¡Buenos días! | ¿Qué | le | ponemos?", "Good morning! | What | (for) you | we-put?", "Morning! What can I get you?"),
    ],
    greet_fill: [
      t("¡Buenas | tardes! | ¿Se lo | lleno?", "Good | afternoon! | It for you | I-fill?", "Good afternoon! Fill it up?",
        { flags: { 2: "se lo: “it for you” (le becomes se before lo)." } }),
    ],
    ask_what: [
      t("¿Lleno, | o | cuánto | le | pongo?", "Full, | or | how much | (for) you | I-put?", "Full, or how much?"),
      t("¿Qué | le | pongo: | lleno, | o | cuánto?", "What | (for) you | I-put: | full, | or | how much?", "What'll it be: full, or how much?"),
    ],
    want_gas_reply: [
      t("Claro. | ¿Lleno, | o | cuánto?", "Sure. | Full, | or | how much?", "Sure. Fill it up, or how much?"),
    ],
    ask_grade: [
      t("¿Magna | o | premium?", "Regular | or | premium?", "Regular or premium?",
        { flags: { 0: "Magna = regular (usually the green handle); premium is usually the red one." } }),
      t("¿De | cuál | le | pongo: | magna | o | premium?", "Of | which | (for) you | I-put: | regular | or | premium?", "Which one, regular or premium?"),
    ],
    which_one: [
      t("¿Cuál, | magna | o | premium?", "Which, | regular | or | premium?", "Which one, regular or premium?"),
      t("¿Cuál | le | pongo, | entonces?", "Which | (for) you | I-put, | then?", "Which one, then?"),
    ],
    grade_ok: [
      t("Muy | bien, | {X}.", "Very | good, | {X}.", "Okay, {X}."),
      t("{X}, | perfecto.", "{X}, | perfect.", "{X}, perfect."),
    ],
    grade_then_magna: [t("Entonces | le | pongo | magna.", "Then | (for) you | I-put | regular.", "Regular, then.")],
    grade_late: [t("Ya | le | estoy | poniendo | {X}, | ¿eh?", "Already | (for) you | I'm | putting | {X}, | eh?", "I've already started with {X}, you know.")],
    ask_amount: [
      t("¿Y | cuánto | le | pongo?", "And | how much | (for) you | I-put?", "And how much should I put in?"),
      t("¿Se lo | lleno, | o | cuánto | le | pongo?", "It for you | I-fill, | or | how much | (for) you | I-put?", "Shall I fill it up, or how much?"),
    ],
    too_much: [
      t("Uy, | eso | es | mucho: | un | tanque | lleno | sale | en | unos | mil | pesos. | ¿Se lo | lleno?",
        "Whoa, | that | is | a lot: | a | tank | full | comes out | at | about | a thousand | pesos. | It for you | I-fill?",
        "Oh, that's a lot: a full tank is about a thousand pesos. Shall I just fill it up?", { flags: { 9: "unos + a number = about." } }),
    ],
    how_much_then: [t("Bueno, | ¿cuánto | le | pongo?", "Okay, | how much | (for) you | I-put?", "Okay, how much should I put in?")],
    say_total: [t("Son | {$price}.", "That's | {$price}.", "That's {$price}.")],
    free_service: [t("No cuesta | nada; | es | parte | del | servicio.", "It doesn't cost | anything; | it's | part | of the | service.", "It's free, it's part of the service.")],
    tip_q: [t("Lo que | usted | guste.", "Whatever | you | like.", "Whatever you like.")],
    no_change_ok: [t("No se preocupe, | sí | tengo | cambio.", "Don't worry, | yes | I-have | change.", "Don't worry, I've got change.")],
    // "¿Está lejos?" and "¿Está cerca?" both: no sí or no in the answer (rule 11)
    far_shop: [t("Aquí | a la vuelta, | nada más.", "Here | around the corner, | just.", "Just around the corner.")],
    far_mech: [t("A | dos | cuadras | nada más.", "At | two | blocks | just.", "Just two blocks away.")],
    far_road: [t("Está | cerquita.", "It's | very close.", "It's really close.", { flags: { 1: "cerquita: cerca (close) with the diminutive, “really close”." } })],
    amount_changed: [t("Muy | bien, | entonces | {$price}.", "Very | good, | then | {$price}.", "Okay, {$price} then.")],
    fill_changed: [t("Muy | bien, | entonces | se lo | lleno.", "Very | good, | then | it for you | I-fill.", "Okay, I'll fill it up then.")],
    already_done: [t("Ya | le | cargué, | ¿eh?", "Already | (for) you | I-loaded, | eh?", "It's already done, though.")],
    // --- starting: the pump at zero
    half_tank: [t("Medio | tanque | son | unos | cuatrocientos | pesos.", "Half | tank | is | about | four hundred | pesos.", "Half a tank is about four hundred pesos.",
      { flags: { 3: "unos + a number = about." } })],
    zero_show: [
      t("Mire, | la | bomba | está | en | ceros, | ¿eh?", "Look, | the | pump | is | at | zero, | okay?", "Look, the pump's at zero, okay?",
        { flags: { 6: "¿eh? asks you to check: the pump shows zero before she starts." } }),
      t("Fíjese: | la | bomba | empieza | en | ceros.", "Notice: | the | pump | starts | at | zero.", "See? The pump starts at zero."),
    ],
    fill_start: [
      t("Ahorita | se lo | lleno.", "Right now | it for you | I-fill.", "I'll fill it up for you now.",
        { flags: { 0: "Mexican: ahorita = right now, in a moment." }, neutral: t("Ahora | se lo | lleno.", "Now | it for you | I-fill.", "I'll fill it up for you now.") }),
      t("Se lo | lleno | enseguida.", "It for you | I-fill | right away.", "I'll fill it right up."),
    ],
    amount_start: [t("Le | pongo | sus | {$price}.", "(For) you | I-put | your | {$price}.", "Putting in your {$price}.")],
    zeros_fixed: [
      t("¡Ay, | tiene razón! | Se quedó | la | venta | anterior. | Perdón. | Ahora | sí | está | en | ceros.",
        "Oh, | you're right! | It stayed | the | sale | previous. | Sorry. | Now | yes | it-is | at | zero.",
        "Oh, you're right! The last sale was still on it. Sorry. Now it's at zero."),
    ],
    zeros_self: [
      t("¡Ay, | espere! | No la puse | en | ceros: | marca | {$price} | de | la | venta | anterior. | Perdón, | ya | está | en | ceros.",
        "Oh, | wait! | I didn't put it | at | zero: | it-shows | {$price} | from | the | sale | previous. | Sorry, | now | it-is | at | zero.",
        "Oh, wait! I didn't reset it: it shows {$price} from the last sale. Sorry, now it's at zero."),
    ],
    zeros_q_fix: [
      t("¡Ay, | no! | Marca | {$price} | de | la | venta | anterior. | Perdón, | ya | la | puse | en | ceros.",
        "Oh, | no! | It-shows | {$price} | from | the | sale | previous. | Sorry, | now | it | I-put | at | zero.",
        "Oh, no! It shows {$price} from the last sale. Sorry, I've reset it now.", { flags: { 10: "la: “it” (la bomba), an object pronoun, not an article." } }),
    ],
    zeros_look: [
      t("Sí, | mire: | en | ceros.", "Yes, | look: | at | zero.", "Yes, look: zero."),
      t("Sí | está, | mire: | cero | pesos.", "Yes | it-is, | look: | zero | pesos.", "It is, look: zero pesos."),
    ],
    // --- the checks
    ask_check: [
      t("¿Le | reviso | el | aceite | y | las | llantas?", "(For) you | I-check | the | oil | and | the | tires?", "Shall I check the oil and the tires?"),
      t("¿Le | checo | el | aceite | y | las | llantas?", "(For) you | I-check | the | oil | and | the | tires?", "Want me to check the oil and the tires?",
        { flags: { 1: "Mexican: checar = to check. Elsewhere: revisar." }, neutral: t("¿Le | reviso | el | aceite | y | las | llantas?", "(For) you | I-check | the | oil | and | the | tires?", "Want me to check the oil and the tires?") }),
    ],
    ask_glass: [t("¿Le | limpio | el | parabrisas?", "(For) you | I-clean | the | windshield?", "Shall I clean your windshield?")],
    extras_again: [
      t("¿Entonces, | se los | reviso?", "So, | them for you | I-check?", "So, shall I check them?"),
    ],
    glass_again: [t("¿Entonces, | se lo | limpio?", "So, | it for you | I-clean?", "So, shall I clean it?")],
    check_yes: [t("Con gusto.", "Gladly.", "Sure thing."), t("Claro que sí.", "Of course.", "Of course.")],
    ok_no: [t("Está bien.", "Okay.", "Okay."), t("Muy | bien.", "Very | good.", "All right.")],
    res_oil: [t("El | aceite | está | bien.", "The | oil | is | fine.", "Your oil's fine.")],
    res_tires: [t("A | las | llantas | les | puse | aire.", "To | the | tires | (to) them | I-put | air.", "I put some air in the tires.",
      { flags: { 3: "les repeats “to the tires”: Spanish often doubles the indirect object." } })],
    res_water: [t("El | agua | del | radiador | está | bien.", "The | water | of the | radiator | is | fine.", "The radiator water's fine.")],
    res_glass: [t("El | parabrisas | ya | quedó | limpio.", "The | windshield | now | it-ended-up | clean.", "The windshield's clean now.")],
    // --- paying
    total_fill: [t("¡Listo, | ya | quedó | lleno! | Son | {$price}.", "Done, | now | it-ended-up | full! | That's | {$price}.", "All done, it's full! That's {$price}.")],
    total_amount: [
      t("¡Listo! | Son | {$price}.", "Done! | That's | {$price}.", "All done! That's {$price}."),
      t("Ya | quedó. | Son | {$price}.", "Already | it's-done. | That's | {$price}.", "There you go. That's {$price}."),
    ],
    ask_pay: [
      t("¿Cómo | va | a | pagar?", "How | you-go | to | pay?", "How would you like to pay?"),
      t("¿Efectivo | o | tarjeta?", "Cash | or | card?", "Cash or card?"),
    ],
    not_yet: [t("Me | paga | al | final, | no se preocupe.", "(To) me | you-pay | at the | end, | don't worry.", "You can pay me at the end, don't worry.")],
    card_yes: [t("Sí, | claro, | con | tarjeta | sí.", "Yes, | sure, | with | card | yes.", "Yes, sure, card's fine.")],
    cash_yes: [t("Sí, | claro.", "Yes, | sure.", "Sure.")],
    terminal: [
      t("Claro, | ahorita | le | traigo | la | terminal.", "Sure, | right now | (to) you | I-bring | the | card machine.", "Sure, I'll bring you the card machine.",
        { flags: { 1: "Mexican: ahorita = right now, in a moment." }, neutral: t("Claro, | enseguida | le | traigo | la | terminal.", "Sure, | right away | (to) you | I-bring | the | card machine.", "Sure, I'll bring you the card machine.") }),
      t("Claro, | aquí | está | la | terminal.", "Sure, | here | is | the | card machine.", "Sure, here's the card machine."),
    ],
    card_through: [t("Acerque | su | tarjeta… | Listo, | ya | pasó.", "Bring close | your | card… | Done, | already | it-went-through.", "Tap your card… Done, it went through.")],
    ask_debit: [t("¿Es | de | crédito | o | de | débito?", "Is it | of | credit | or | of | debit?", "Is it credit or debit?")],
    which_card: [t("Perdón, | ¿crédito | o | débito?", "Sorry, | credit | or | debit?", "Sorry, credit or debit?")],
    // debit: the card first, then the PIN
    pin: [t("Acerque | su | tarjeta | y | marque | su | NIP… | Listo, | ya | pasó.", "Bring close | your | card | and | dial | your | PIN… | Done, | already | it-went-through.",
      "Tap your card and enter your PIN… Done, it went through.",
      { flags: { 6: "In Mexico a card's PIN is the NIP (número de identificación personal)." } })],
    cash_thanks: [t("Gracias.", "Thanks.", "Thank you."), t("Muchas | gracias.", "Many | thanks.", "Thank you very much.")],
    short: [t("Perdón, | son | {$total}; | faltan | {$price}.", "Sorry, | it's | {$total}; | they're-missing | {$price}.", "Sorry, it's {$total}; you're {$price} short.")],
    change_is: [t("Aquí tiene | su | cambio: | {$price}.", "Here's | your | change: | {$price}.", "Here's your change: {$price}.")],
    change_back: [t("Gracias, | aquí tiene | su | cambio.", "Thanks, | here's | your | change.", "Thanks, here's your change.")],
    tip_thanks: [
      t("¡Ay, | gracias, | muy | amable!", "Oh, | thanks, | very | kind!", "Oh, thank you, that's very kind!"),
      t("¡Muchas | gracias! | Se lo | agradezco.", "Many | thanks! | It to you | I-appreciate.", "Thank you so much! I appreciate it."),
    ],
    dollars: [
      t("Sí | aceptamos, | pero | al | tipo de cambio | de | aquí. | Le | conviene | más | en | pesos.",
        "Yes | we-accept, | but | at the | exchange rate | of | here. | (To) you | it-suits | more | in | pesos.",
        "We do, but at our exchange rate. You're better off paying in pesos."),
    ],
    // --- the receipt
    ask_receipt: [
      t("¿Le | doy | su | ticket?", "(To) you | I-give | your | receipt?", "Do you want your receipt?",
        { flags: { 3: "Mexican: a receipt is a ticket. Elsewhere: recibo." }, neutral: t("¿Le | doy | su | recibo?", "(To) you | I-give | your | receipt?", "Do you want your receipt?") }),
      t("¿Quiere | su | ticket?", "Do you want | your | receipt?", "Would you like a receipt?",
        { flags: { 2: "Mexican: a receipt is a ticket. Elsewhere: recibo." }, neutral: t("¿Quiere | su | recibo?", "Do you want | your | receipt?", "Would you like a receipt?") }),
    ],
    receipt_here: [t("Aquí tiene | su | ticket.", "Here's | your | receipt.", "Here's your receipt.",
      { flags: { 2: "Mexican: a receipt is a ticket. Elsewhere: recibo." }, neutral: t("Aquí tiene | su | recibo.", "Here's | your | receipt.", "Here's your receipt.") })],
    factura: [
      t("Claro. | Con | el | ticket | la | puede | sacar | en línea; | ahí | viene | la | página.",
        "Sure. | With | the | receipt | it | you-can | get | online; | there | comes | the | website.",
        "Sure. You can get it online with the receipt; the website's printed on it.",
        { flags: { 3: "Mexican: ticket = receipt. A factura is the tax invoice.", 4: "la: “it” (la factura), an object pronoun." },
          neutral: t("Claro. | Con | el | recibo | la | puede | sacar | en línea; | ahí | viene | la | página.", "Sure. | With | the | receipt | it | you-can | get | online; | there | comes | the | website.", "Sure. You can get it online with the receipt; the website's printed on it.") }),
    ],
    // the ticket was just handed over
    factura_now: [
      t("Con | él | la | puede | sacar | en línea; | ahí | viene | la | página.", "With | it | it | you-can | get | online; | there | comes | the | website.",
        "You can get the invoice online with it; the website's printed on it.", { flags: { 2: "la: “it” (la factura), an object pronoun." } }),
    ],
    // --- questions
    anything_else: [
      t("¿Se le ofrece | algo | más?", "Do you need | something | more?", "Anything else I can do for you?"),
      t("¿Algo | más | en | que | le | pueda | ayudar?", "Something | more | in | which | (to) you | I-can | help?", "Anything else I can help you with?"),
    ],
    anything_short: [t("¿Algo | más?", "Something | more?", "Anything else?")],
    what_need: [t("Dígame.", "Tell me.", "Sure, go ahead.")],
    restroom: [t("Allá | atrás, | junto | a | la | tienda.", "Over there | at the back, | next | to | the | store.", "Around the back, next to the store.")],
    directions: [
      t("Saliendo, | a la derecha, | y | en | el | semáforo, | a la izquierda. | Ahí | ya | ve | los | letreros | de | la | carretera.",
        "Leaving, | to the right, | and | at | the | traffic light, | to the left. | There | already | you-see | the | signs | of | the | highway.",
        "Turn right as you leave, then left at the light. From there you'll see the signs for the highway."),
    ],
    air_line: [t("Claro, | yo | le | pongo | aire | a | las | llantas.", "Sure, | I | (for) you | put | air | in | the | tires.", "Sure, I'll put some air in your tires for you.")],
    atm: [t("Hay | uno | adentro | de | la | tienda.", "There's | one | inside | of | the | store.", "There's one inside the store.")],
    coffee: [t("En | la | tienda | hay | café | y | algo | de | comer.", "In | the | store | there's | coffee | and | something | to | eat.", "The store has coffee and snacks.")],
    gas_price: [
      t("La | magna | anda | en | unos | veinticuatro | pesos | el | litro, | y | la | premium | un poco | más.",
        "The | regular | goes | at | about | twenty-four | pesos | the | liter, | and | the | premium | a little | more.",
        "Regular's around twenty-four pesos a liter, and premium a bit more.", { flags: { 2: "andar en = to be around (a price).", 4: "unos + a number = about." } }),
    ],
    per_liter: [t("Aquí | vendemos | por | litro.", "Here | we-sell | by | liter.", "We sell it by the liter here.")],
    fill_price: [
      t("Depende | del | tanque. | Uno | chico | se llena | con | unos | ochocientos | pesos.", "It-depends | on the | tank. | One | small | gets-filled | with | about | eight hundred | pesos.",
        "Depends on the tank. A small one fills up for about eight hundred pesos.", { flags: { 7: "unos + a number = about." } }),
    ],
    grade_info: [
      t("Para | casi | todos | los | carros, | la | magna | está | bien.", "For | almost | all | the | cars, | the | regular | is | fine.", "Regular's fine for almost any car.",
        { flags: { 4: "Mexican: carro = car. Elsewhere: auto, coche." }, neutral: t("Para | casi | todos | los | autos, | la | magna | está | bien.", "For | almost | all | the | cars, | the | regular | is | fine.", "Regular's fine for almost any car.") }),
    ],
    grade_diff: [t("La | premium | cuesta | un poco | más, | pero | para | casi | todos | los | carros | la | magna | está | bien.",
      "The | premium | costs | a little | more, | but | for | almost | all | the | cars | the | regular | is | fine.",
      "Premium costs a bit more, but regular's fine for almost any car.",
      { flags: { 10: "Mexican: carro = car. Elsewhere: auto, coche." },
        neutral: t("La | premium | cuesta | un poco | más, | pero | para | casi | todos | los | autos | la | magna | está | bien.",
          "The | premium | costs | a little | more, | but | for | almost | all | the | cars | the | regular | is | fine.",
          "Premium costs a bit more, but regular's fine for almost any car.") })],
    grade_colors: [t("La | verde | es | la | magna, | y | la | roja, | la | premium.", "The | green | is | the | regular, | and | the | red, | the | premium.", "The green one's regular, and the red one's premium.")],
    diesel_yes: [t("Sí, | también | tenemos | diésel.", "Yes, | also | we-have | diesel.", "Yes, we have diesel too.")],
    pay_here: [t("Aquí | conmigo; | no tiene | que | entrar.", "Here | with me; | you don't have | to | go in.", "Right here with me, you don't need to go inside.")],
    // --- car trouble (twist)
    // one question only: a bare "No" must not mean both "not okay" and "no problem" (rule 11)
    back_already: [t("Oiga, | ¿todo | bien?", "Hey, | everything | okay?", "Hey, everything okay?")],
    trouble_bye_flat: [t("¡Suerte | con | la | llanta!", "Good luck | with | the | tire!", "Good luck with the tire!")],
    trouble_bye: [t("¡Suerte! | Ojalá | no | sea | nada.", "Good luck! | Hopefully | not | it-be | anything.", "Good luck! I hope it's nothing serious.")],
    what_happened: [t("¿Qué | pasó?", "What | happened?", "What happened?")],
    trouble_reply: [
      t("¿No arranca? | Ha de ser | la | batería. | Si | quiere, | le | pasamos corriente; | tengo | cables.",
        "It won't start? | It must be | the | battery. | If | you-want, | (for) you | we-jump-start; | I-have | cables.",
        "Won't start? Must be the battery. If you like, we can give you a jump; I've got cables."),
    ],
    flat_reply: [
      t("¡Ay, | no! | A la vuelta | hay | una | vulcanizadora. | Si | quiere, | primero | le | pongo | aire | para | que | llegue.",
        "Oh, | no! | Around the corner | there's | a | tire shop. | If | you-want, | first | (for) you | I-put | air | so | that | you-get-there.",
        "Oh no! There's a tire repair shop around the corner. If you like, I'll put some air in first so you can make it there.",
        { flags: { 5: "Mexican: vulcanizadora = tire repair shop." },
          neutral: t("¡Ay, | no! | A la vuelta | hay | un | taller | de | llantas. | Si | quiere, | primero | le | pongo | aire | para | que | llegue.",
            "Oh, | no! | Around the corner | there's | a | shop | of | tires. | If | you-want, | first | (for) you | I-put | air | so | that | you-get-there.",
            "Oh no! There's a tire repair shop around the corner. If you like, I'll put some air in first so you can make it there.") }),
    ],
    battery_reply: [
      t("¡Ay! | Si | quiere, | le | pasamos corriente; | tengo | cables.", "Oh! | If | you-want, | (for) you | we-jump-start; | I-have | cables.", "Oh no! If you like, we can give you a jump; I've got cables."),
    ],
    other_reply: [
      t("Uy, | mejor | que | se lo | revisen. | Hay | un | taller | mecánico | a | dos | cuadras, | sobre | esta | misma | calle.",
        "Oh, | better | that | it for you | they-check. | There's | a | shop | mechanic | at | two | blocks, | on | this | same | street.",
        "Oh, you'd better get it checked. There's a mechanic two blocks down, on this same street."),
    ],
    jump: [t("Claro. | Voy | por | los | cables.", "Sure. | I-go | for | the | cables.", "Sure. I'll go get the cables.")],
    tow: [t("Claro, | le | llamo | a | la | grúa. | A veces | tarda | un | rato.", "Sure, | (for) you | I-call | to | the | tow truck. | Sometimes | it-takes | a | while.", "Sure, I'll call the tow truck. It can take a while.")],
    inflate: [t("Claro, | se la | inflo | para | que | llegue | al | taller.", "Sure, | it for you | I-inflate | so | that | you-get | to the | shop.", "Sure, I'll pump it up so you can get to the shop.")],
    mechanic: [t("Hay | un | taller | mecánico | a | dos | cuadras, | sobre | esta | misma | calle.", "There's | a | shop | mechanic | at | two | blocks, | on | this | same | street.", "There's a mechanic two blocks down, on this same street.")],
    tire_shop: [t("Aquí | a la vuelta, | a la derecha. | Se la | arreglan | rápido.", "Here | around the corner, | to the right. | It for you | they-fix | fast.", "Just around the corner, on the right. They'll fix it fast.")],
    all_good: [t("¡Qué | bueno!", "How | good!", "Good to hear!")],
    bye: [
      t("¡Buen | viaje!", "Good | trip!", "Have a good trip!"),
      t("¡Maneje | con | cuidado!", "Drive | with | care!", "Drive safely!"),
    ],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Claro.", "Sure.", "Sure.")],
  },

  domains: {
    price: () => {
      const s = new Set<number>([LAST_SALE]);
      for (let p = 2000; p <= MAX_AMOUNT; p += 500) s.add(p);
      for (const f of FILL_COSTS) { s.add(f); for (const bill of [100000, 200000]) s.add(bill - f); }
      for (let p = 500; p <= 100000; p += 500) s.add(p); // change from a bill
      return [...s].sort((a, b) => a - b);
    },
  },

  hints: {
    order: {
      lt: "Say how much (or a full tank)",
      items: [
        { id: "fill", s: t("Lleno, | por favor.", "Full, | please.", "Fill it up, please.") },
        { id: "fill_grade", s: t("Lleno | de | magna, | por favor.", "Full | of | regular, | please.", "Fill it up with regular, please.") },
        { id: "prepay", s: t("Quinientos | pesos | de | magna, | por favor.", "Five hundred | pesos | of | regular, | please.", "Five hundred pesos of regular, please."),
          note: "Say the amount in pesos and the fuel: magna (regular) or premium." },
        { id: "put", s: t("Póngale | quinientos, | por favor.", "Put in | five hundred, | please.", "Put in five hundred, please."), note: "Very Mexican: póngale = put (it) in." },
        { id: "fill_ask", s: t("¿Me lo | llena, | por favor?", "It for me | you-fill, | please?", "Could you fill it up, please?") },
        { id: "want_gas", s: t("Necesito | gasolina.", "I-need | gas.", "I need gas.") },
      ],
    },
    grade: {
      lt: "Choose the fuel", slot: "grade", examples: ["magna", "premium"],
      items: [
        { id: "grade_pick", s: t("{X}, | por favor.", "{X}, | please.", "{X}, please."), note: "Magna is regular; premium costs a little more." },
        { id: "grade_de", s: t("De | {X}.", "Of | {X}.", "{X}."), only: (e) => e.id !== "diesel" },
        { id: "q_grade", s: t("¿Cuál | me | recomienda?", "Which | (to) me | you-recommend?", "Which one do you recommend?") },
      ],
    },
    zeros: {
      lt: "Check the pump starts at zero",
      items: [
        { id: "zeros_no", s: t("Espere, | no está | en | ceros.", "Wait, | it isn't | at | zero.", "Wait, it isn't at zero."), note: "A classic trick: the last sale left on the pump. Always look before they start." },
        { id: "zeros_reset", s: t("¿La | puede | poner | en | ceros?", "It | can you | put | at | zero?", "Could you reset it to zero?", { flags: { 0: "la: “it” (la bomba, the pump), an object pronoun." } }) },
        { id: "q_zeros", s: t("¿Está | en | ceros?", "Is it | at | zero?", "Is it at zero?") },
      ],
    },
    extras: {
      lt: "Answer the offer (oil, tires, windshield)",
      items: [
        { id: "check_yes", s: t("Sí, | revíseme | las | llantas, | por favor.", "Yes, | check me | the | tires, | please.", "Yes, please check the tires."), note: "These checks are free; people give the attendant a small tip." },
        { id: "check_only", s: t("Nada más | el | aceite, | por favor.", "Just | the | oil, | please.", "Just the oil, please.") },
        { id: "check_glass", s: t("¿Me | limpia | el | parabrisas?", "(For) me | you-clean | the | windshield?", "Could you clean the windshield?") },
        { id: "more_fine", s: t("No, | gracias, | así | está | bien.", "No, | thanks, | like this | it's | fine.", "No, thanks, I'm fine.") },
      ],
    },
    pay: {
      lt: "Pay",
      items: [
        { id: "pay_card_short", s: t("Con | tarjeta, | por favor.", "With | card, | please.", "Card, please.") },
        { id: "take_cards", s: t("¿Acepta | tarjeta?", "Do you accept | card?", "Do you take cards?") },
        { id: "pay_card", s: t("¿Puedo | pagar | con | tarjeta?", "Can I | pay | with | card?", "Can I pay by card?") },
        { id: "pay_cash", s: t("En efectivo.", "In cash.", "Cash.") },
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
        { id: "q_dollars", s: t("¿Acepta | dólares?", "Do you accept | dollars?", "Do you take dollars?") },
      ],
    },
    debit: {
      lt: "Say credit or debit",
      items: [
        { id: "credit", s: t("De | crédito.", "Of | credit.", "Credit.") },
        { id: "debit", s: t("De | débito.", "Of | debit.", "Debit."), note: "The card machine may ask for your NIP (PIN)." },
      ],
    },
    tip: {
      lt: "Give a tip",
      items: [
        { id: "tip_for_you", s: t("Esto | es | para | usted.", "This | is | for | you.", "This is for you.") },
        { id: "keep_change", s: t("Quédese | con | el | cambio.", "Keep | with | the | change.", "Keep the change.") },
        { id: "tip_amount", s: t("Le | dejo | veinte | de | propina.", "(To) you | I-leave | twenty | of | tip.", "Here's twenty for you."), note: "A tip of ten or twenty pesos is usual, more if she cleaned or checked something." },
        { id: "tip_refresco", s: t("Para | su | refresco.", "For | your | soda.", "Get yourself a soda."), note: "A friendly Mexican way to give a small tip." },
      ],
    },
    receipt: {
      lt: "Ask for a receipt",
      items: [
        { id: "receipt", s: t("¿Me | da | el | ticket, | por favor?", "(To) me | you-give | the | receipt, | please?", "Could I have the receipt, please?",
          { flags: { 3: "Mexican: ticket = receipt. Elsewhere: recibo." }, neutral: t("¿Me | da | el | recibo, | por favor?", "(To) me | you-give | the | receipt, | please?", "Could I have the receipt, please?") }) },
        { id: "factura", s: t("¿Me | puede | dar | factura?", "(To) me | can you | give | invoice?", "Could I get an invoice?"), note: "A factura is the tax invoice a business needs." },
      ],
    },
    ask: {
      lt: "Ask something (restroom, road, air)",
      items: [
        { id: "q_restroom", s: t("¿Dónde | está | el | baño?", "Where | is | the | restroom?", "Where's the restroom?") },
        { id: "q_road", s: t("¿Cómo | llego | a | la | carretera?", "How | I-get | to | the | highway?", "How do I get to the highway?") },
        { id: "q_air", s: t("¿Dónde | pongo | aire?", "Where | I-put | air?", "Where can I put air in my tires?") },
        { id: "q_price", s: t("¿A cómo | está | la | magna?", "How much | is | the | regular?", "How much is regular?") },
        { id: "q_where_pay", s: t("¿Dónde | pago?", "Where | I-pay?", "Where do I pay?") },
        { id: "q_atm", s: t("¿Hay | un | cajero | por | aquí?", "Is there | an | ATM | around | here?", "Is there an ATM around here?") },
      ],
    },
    more: {
      lt: "Say that's all",
      items: [
        { id: "more_no", s: t("Es | todo, | gracias.", "It's | all, | thanks.", "That's all, thanks.") },
      ],
    },
    trouble: {
      lt: "Explain the problem",
      items: [
        { id: "car_wont_start", s: t("Mi | carro | no arranca.", "My | car | won't start.", "My car won't start.",
          { flags: { 1: "Mexican: carro = car. Elsewhere: auto, coche." }, neutral: t("Mi | auto | no arranca.", "My | car | won't start.", "My car won't start.") }) },
        { id: "flat_tire", s: t("Tengo | una | llanta | ponchada.", "I-have | a | tire | punctured.", "I have a flat tire.",
          { flags: { 3: "Mexican: ponchada = flat (punctured). Elsewhere: pinchada." }, neutral: t("Tengo | una | llanta | pinchada.", "I-have | a | tire | punctured.", "I have a flat tire.") }) },
      ],
    },
    help: {
      lt: "Ask for help",
      items: [
        { id: "q_mechanic", s: t("¿Hay | un | taller | cerca?", "Is there | a | repair shop | nearby?", "Is there a mechanic nearby?") },
        { id: "help_jump", s: t("¿Me | puede | pasar corriente?", "(For) me | can you | jump-start?", "Could you give me a jump?") },
        { id: "tow", s: t("¿Puede | llamar | a | una | grúa?", "Can you | call | to | a | tow truck?", "Could you call a tow truck?") },
      ],
    },
  },

  tips: TIPS,

  merges: {
    "tiene razón": { reason: "lexical_expression", split: "tiene → you have + razón → reason is a false literal; = you're right.", minimal: "Two words." },
    "tipo de cambio": { reason: "lexical_expression", split: "tipo → type + de → of + cambio → change misreads the money term: exchange rate.", minimal: "Three words, one term." },
    "en línea": { reason: "lexical_expression", split: "en → in + línea → line; the internet sense = online.", minimal: "Two words." },
    "se le ofrece": { reason: "lexical_expression", split: "se → itself + le → to you + ofrece → it offers; the service formula = do you need / can I get you.", minimal: "Three words." },
    "un poco": { reason: "lexical_expression", split: "un → a + poco → little; together = a little / a bit.", minimal: "Two words." },
    "ha de ser": { reason: "lexical_expression", split: "ha → has + de → of + ser → to be is a false literal; Mexican guess = it must be.", minimal: "Three words." },
    "pasamos corriente": { reason: "lexical_expression", split: "pasamos → we pass + corriente → current; a car with a dead battery = we jump-start (it).", minimal: "Verb and noun only." },
    "pasar corriente": { reason: "lexical_expression", split: "pasar → pass + corriente → current; a car with a dead battery = jump-start.", minimal: "Verb and noun only." },
  },

  mission: [
    { lt: "Say how much (or a full tank)", done: (c) => !!c.s.amount || !!c.s.fill },
    { lt: "Choose the fuel", done: (c) => !!c.s.grade },
    { lt: "Check the pump starts at zero", optional: true, when: (c) => !!c.s.zerosTwist && !!c.s.zerosAsked, done: (c) => !!c.s.zerosDone },
    { lt: "Pay the attendant", done: (c) => !!c.s.paid },
    { lt: "Explain the car trouble", optional: true, when: (c) => !!c.s.trouble, done: (c) => !!c.s.troubleDone },
  ],

  // -------------------------------------------------------------------------

  steps: [
    { id: "order", done: (c) => !!c.s.amount || !!c.s.fill || !!c.s.grade,
      ask: (c) => {
        if (!c.s.greeted) { c.s.greeted = true; c.say(c.s.greetFill ? "greet_fill" : "greet"); return; }
        c.s.greetFill = false;
        c.say("ask_what");
      },
      expects: ["prepay", "fill", "half_tank", "want_gas", "amount_ctx", "grade_ans", "amount_change_ctx", "gas_price_q"],
      suggest: [{ lt: "Say how much (or a full tank)", hint: "order" }, { lt: "Ask something", hint: "ask" }],
      // "¿Se lo lleno?": yes fills it; no, she asks how much
      yes: (c) => { if (c.s.greetFill) gas.handlers.fill(c, {}, { intent: "fill", slots: {}, tags: [] }); else { c.say("ask_what"); c.hold(); } },
      no: (c) => { c.s.greetFill = false; c.say("how_much_then"); c.hold(); } },
    { id: "grade", when: (c) => (!!c.s.amount || !!c.s.fill) && !c.s.grade, done: (c) => !!c.s.grade,
      ask: (c) => c.say(c.s.gradeAsked ? "which_one" : "ask_grade"), expects: ["grade_ans", "grade_no", "grade_q", "amount_change_ctx", "gas_price_q"],
      suggest: [{ lt: "Choose the fuel", hint: "grade", options: "grade" }],
      yes: (c) => { c.s.gradeAsked = true; c.say("which_one"); c.hold(); } },
    { id: "amount", when: (c) => !!c.s.grade && !c.s.amount && !c.s.fill, done: (c) => !!c.s.amount || !!c.s.fill,
      ask: (c) => c.say("ask_amount"), expects: ["amount_ctx", "fill", "fill_no", "half_tank", "prepay", "amount_change_ctx", "gas_price_q"],
      suggest: [{ lt: "Say how much (or a full tank)", hint: "order" }] },
    // the twist: she starts without showing zero, and the pump still shows the last sale
    { id: "zeros", when: (c) => !!c.s.zerosTwist && (!!c.s.amount || !!c.s.fill) && !!c.s.grade && !c.s.zerosDone, done: (c) => !!c.s.zerosDone,
      // she starts right away, without showing the pump
      ask: (c) => {
        // asked again (the learner said something else): she sees it herself, never the same line twice
        if (c.s.zerosAsked) { zerosSelf(c); return; }
        c.s.zerosAsked = true; c.twist("zeros"); c.say(c.s.fill ? "fill_start" : "amount_start", { price: c.s.amount });
      },
      expects: ["zeros_ctx", "zeros_wait_ctx", "zeros_q", "ok_ack"],
      suggest: [{ lt: "The pump already shows $150, not $0: tell her", hint: "zeros" }],
      yes: (c) => zerosSelf(c), no: (c) => zerosFix(c, "zeros_fixed") },
    { id: "pump_on", when: (c) => (!!c.s.amount || !!c.s.fill) && !!c.s.grade && !c.s.pumpOn, done: (c) => !!c.s.pumpOn,
      ask: (c) => {
        c.say("zero_show");
        startFueling(c);
      },
      expects: ["zeros_ctx", "zeros_q", "ok_ack", "amount_change_ctx"],
      suggest: [{ lt: "Say okay (or ask something)", hint: "zeros" }],
      yes: () => { /* she starts; the next question follows */ },
      no: (c) => c.say("zeros_look") },
    { id: "extras", when: (c) => !!c.s.pumpOn && !!c.s.askExtras && c.s.extrasDone === undefined && !c.s.paid, done: (c) => c.s.extrasDone !== undefined,
      ask: (c) => {
        c.s.extrasAsks = (c.s.extrasAsks ?? 0) + 1;
        if (c.s.extrasAsks > 1) c.say(c.s.offer === "glass" ? "glass_again" : "extras_again");
        else c.say(c.s.offer === "glass" ? "ask_glass" : "ask_check");
      },
      expects: ["check_order", "check_ctx", "check_no", "more_no", "more_no_ctx", "air", "cost_q"],
      suggest: [{ lt: "Answer the offer", hint: "extras" }],
      yes: (c) => { c.s.extrasDone = "yes"; c.s.checks = c.s.offer === "glass" ? ["glass"] : ["oil", "tires"]; c.say("check_yes"); },
      no: (c) => { c.s.extrasDone = "no"; c.say("ok_no"); } },
    { id: "pay", when: (c) => !!c.s.pumpOn && !c.s.paid && (!!c.s.amount || !!c.s.fill), done: (c) => !!c.s.paid,
      ask: (c) => {
        if (!c.s.totalSaid) {
          c.s.totalSaid = true;
          for (const k of (c.s.checks ?? []) as string[]) c.say(RESULT[k]);
          c.say(fullTank(c) ? "total_fill" : "total_amount", { price: due(c) });
          if (c.s.method === "card") { finishPay(c, "card"); return; }
          if (!c.s.method && c.chance(0.5)) c.say("ask_pay");
          return;
        }
        if (c.s.method !== "cash") c.say("ask_pay"); // cash: she waits for the money
      },
      expects: ["pay_card", "pay_cash", "here_you_go", "no_cash", "no_card", "amount_ctx", "tip", "pay_dollars", "cost_q", "no_change"],
      suggest: [{ lt: "Pay (cash or card)", hint: "pay" }, { lt: "Give a tip", hint: "tip" }] },
    { id: "debit", when: (c) => c.s.method === "card" && !!c.s.askDebit && !c.s.cardType && !!c.s.paid, done: (c) => !!c.s.cardType,
      ask: (c) => c.say("ask_debit"), expects: ["credit_debit"],
      suggest: [{ lt: "Say credit or debit", hint: "debit" }] },
    { id: "receipt", when: (c) => !!c.s.paid && !!c.s.askReceipt && c.s.receipt === undefined && (c.s.method !== "card" || !c.s.askDebit || !!c.s.cardType),
      done: (c) => c.s.receipt !== undefined,
      ask: (c) => c.say("ask_receipt"), expects: ["receipt_ask", "no_receipt", "receipt_no_ctx"],
      suggest: [{ lt: "Say yes or no", hint: "g_yesno" }, { lt: "Give a tip", hint: "tip" }],
      yes: (c) => giveReceipt(c),
      no: (c) => { c.s.receipt = false; c.say("ok_no"); } },
    { id: "trouble", when: (c) => !!c.s.paid && !!c.s.troubleTwist && !c.s.troubleDone && !c.s.trouble && !receiptOpen(c), done: (c) => !!c.s.trouble || !!c.s.troubleDone,
      ask: (c) => {
        if (c.s.troubleAsked) { c.say("what_happened"); return; }
        c.s.troubleAsked = true; c.twist("car_trouble"); c.say("back_already");
      },
      expects: ["trouble", "trouble_vague", "ok_ack", "more_no"],
      suggest: [{ lt: "Explain the problem (won't start, a flat tire)", hint: "trouble" }],
      yes: (c) => { c.s.troubleDone = true; c.say("all_good"); },
      no: (c) => { c.say("what_happened"); c.hold(); } },
    { id: "trouble_help", when: (c) => !!c.s.trouble && !c.s.troubleDone, done: (c) => !!c.s.troubleDone,
      ask: (c) => {
        if (!c.s.troubleReplied) {
          c.s.troubleReplied = true;
          if (c.s.trouble === "other") { c.s.troubleDone = true; c.say("other_reply"); return; }
          c.s.helpOffered = true;
          c.say(c.s.trouble === "flat" ? "flat_reply" : c.s.battery ? "battery_reply" : "trouble_reply"); return;
        }
        c.s.helpOffered = false; // now the question is "¿Se le ofrece algo más?"
        c.say("anything_else");
      },
      expects: ["ask_mechanic", "call_help", "more_no", "more_no_ctx", "air", "far_q"],
      suggest: [{ lt: "Ask for help", hint: "help" }],
      // her offer ("Si quiere, le pasamos corriente" / "le pongo aire"): yes takes it
      yes: (c) => {
        if (!c.s.helpOffered) { c.say("what_need"); c.hold(); return; }
        c.s.troubleDone = true; c.say(c.s.trouble === "flat" ? "inflate" : "jump");
      },
      no: (c) => { c.s.troubleDone = true; c.say("ok_no"); } },
    { id: "anything", when: (c) => !!c.s.paid && !!c.s.askAnything && !c.s.anythingDone && !c.s.troubleTwist && !receiptOpen(c), done: (c) => !!c.s.anythingDone,
      ask: (c) => { c.s.anyAsks = (c.s.anyAsks ?? 0) + 1; c.say(c.s.anyAsks > 1 ? "anything_short" : "anything_else"); },
      expects: ["restroom", "directions", "air", "more_no", "more_no_ctx", "atm", "coffee_where"],
      suggest: [{ lt: "Ask something (or say that's all)", hint: "ask" }, { lt: "Say that's all", hint: "more" }],
      yes: (c) => { c.say("what_need"); c.hold(); },
      no: (c) => { c.s.anythingDone = true; } },
  ],

  init: (c) => {
    c.s.greetFill = c.chance(0.3);
    c.s.askExtras = c.chance(0.6);
    c.s.offer = c.chance(0.6) ? "oil_tires" : "glass";
    c.s.askDebit = c.chance(0.5);
    c.s.askReceipt = c.chance(0.5);
    c.s.askAnything = c.chance(0.5);
    c.s.zerosTwist = c.chance(0.25);
    c.s.troubleTwist = c.visits >= 1 && c.chance(0.4);
    c.s.fillCost = c.pick(FILL_COSTS);
  },

  start: () => { /* the first step greets */ },

  handlers: {
    fill(c, slots) {
      if (c.s.totalSaid) { c.say("already_done"); return; }
      const wasAmount = !!c.s.amount;
      c.s.fill = true; c.s.amount = undefined;
      if (slots.grade) setGrade(c, slots.grade as string);
      if (c.s.pumpOn || (wasAmount && c.step !== "order" && c.step !== "amount")) c.say("fill_changed");
    },
    fill_no(c) {
      if (c.s.totalSaid) { c.say("already_done"); return; }
      if (c.s.amount) { c.say("ack"); return; }
      c.s.fill = false;
      c.say("how_much_then"); c.hold();
    },
    prepay(c, slots) {
      if (c.s.totalSaid) { c.say("already_done"); return; }
      if (slots.grade) setGrade(c, slots.grade as string);
      setAmount(c, slots.price as number | undefined);
    },
    amount_ctx(c, slots) {
      const cents = slots.price as number | undefined;
      if (!cents) return;
      // at the paying step a bare amount is the bill handed over
      if (c.s.totalSaid && !c.s.paid) { finishPay(c, "cash", cents, keepsChange(c)); return; }
      if (c.s.totalSaid) return;
      setAmount(c, cents);
    },
    amount_change_ctx(c, slots) {
      if (c.s.totalSaid) { c.say("already_done"); return; }
      if (slots.grade && !c.s.pumpOn) setGrade(c, slots.grade as string);
      const before = c.s.amount;
      setAmount(c, slots.price as number | undefined);
      if (c.s.amount && c.s.amount !== before && (c.s.pumpOn || c.step !== "order")) c.say("amount_changed", { price: c.s.amount });
    },
    half_tank(c, slots) {
      if (c.s.totalSaid) { c.say("already_done"); return; }
      if (slots.grade) setGrade(c, slots.grade as string);
      c.say("half_tank");
      setAmount(c, 40000);
    },
    want_gas(c) {
      if (c.s.amount || c.s.fill) return;
      c.say("want_gas_reply"); c.hold();
    },
    grade_ans(c, slots, seg) {
      // "La que sea": regular
      if (!slots.grade && seg.tags.includes("any")) { if (!c.s.pumpOn && !c.s.grade) { c.s.grade = "magna"; c.say("grade_then_magna"); } return; }
      const id = slots.grade as string | undefined;
      if (!id) return;
      if (c.s.pumpOn && c.s.grade && c.s.grade !== id) { c.say("grade_late", { X: c.s.grade }); return; }
      if (c.s.grade === id) return;
      setGrade(c, id);
      c.say("grade_ok", { X: id });
    },
    grade_no(c, slots) {
      const id = slots.grade as string | undefined;
      if (c.s.pumpOn) return;
      if (id === "premium" && (!c.s.grade || c.s.grade === "premium")) { c.s.grade = "magna"; c.say("grade_then_magna"); return; }
      if (id && c.s.grade === id) c.s.grade = undefined;
      if (!c.s.grade) { c.s.gradeAsked = true; c.say("which_one"); c.hold(); }
    },
    grade_q(c, _slots, seg) {
      if (seg.tags.includes("diesel")) c.say("diesel_yes");
      else if (seg.tags.includes("diff")) c.say("grade_diff");
      else if (seg.tags.includes("which")) c.say("grade_colors");
      else c.say("grade_info");
    },
    gas_price_q(c, _slots, seg) {
      if (seg.tags.includes("fillq")) { c.say("fill_price"); return; }
      if (seg.tags.includes("galon")) c.say("per_liter");
      c.say("gas_price");
    },
    pay_pump_q(c) { c.say("pay_here"); },
    tip_q(c) { c.say("tip_q"); },
    cost_q(c, _slots, seg) {
      if (seg.tags.includes("free") || (c.step === "extras" && c.s.extrasDone === undefined)) { c.say("free_service"); c.hold(); return; }
      if (c.s.totalSaid || c.s.amount) { c.say("say_total", { price: due(c) }); c.hold(); return; }
      c.say(c.s.fill ? "fill_price" : "gas_price");
    },
    no_change(c) { c.say("no_change_ok"); },
    far_q(c, _slots, seg) {
      if (seg.tags.includes("road") || !c.s.trouble) c.say("far_road");
      else c.say(c.s.trouble === "flat" ? "far_shop" : "far_mech");
    },
    trouble_vague(c) {
      if (c.s.trouble) return;
      c.s.troubleAsked = true;
      c.say("what_happened"); c.hold();
    },
    zeros_wait_ctx(c) {
      if (c.s.zerosTwist && !c.s.zerosDone) { zerosFix(c, "zeros_fixed"); return; }
      c.say("g_take_time"); c.hold();
    },
    zeros_q(c) {
      if (c.s.zerosTwist && !c.s.zerosDone && (c.s.amount || c.s.fill) && c.s.grade) { zerosFix(c, "zeros_q_fix"); return; }
      c.say("zeros_look");
    },
    zeros_ctx(c) {
      if (c.s.zerosTwist && !c.s.zerosDone) { zerosFix(c, "zeros_fixed"); return; }
      c.say("zeros_look");
    },
    ok_ack(c) {
      if (c.step === "zeros" && !c.s.zerosDone) { zerosSelf(c); return; }
      if (c.step === "trouble" && !c.s.trouble) { c.s.troubleDone = true; c.say("all_good"); }
    },
    check_order(c, _slots, seg) {
      const tags = seg.tags;
      const ks: string[] = tags.includes("all") ? ["oil", "tires", "glass"] : tags.includes("offer") ? (c.s.offer === "glass" ? ["glass"] : ["oil", "tires"])
        : ["oil", "water", "tires", "glass"].filter((k) => tags.includes(k));
      if (!ks.length) return;
      if (!c.s.paid) c.s.checks = [...new Set([...((c.s.checks ?? []) as string[]), ...ks])];
      if (c.s.extrasDone === undefined) c.s.extrasDone = "yes";
      if (c.s.paid && ks.includes("tires")) { c.say("air_line"); return; }
      c.say("check_yes");
      // asked once she's done fueling: she does it right away
      if (c.s.totalSaid) for (const k of ks) c.say(RESULT[k]);
    },
    check_ctx(c, slots, seg) { gas.handlers.check_order(c, slots, seg); },
    check_no(c, _slots, seg) {
      const not = ["oil", "water", "tires", "glass"].filter((k) => seg.tags.includes(k));
      // "Sí, pero el aceite no": the rest of her offer
      if (seg.tags.includes("but") && c.s.extrasDone === undefined && !c.s.paid) {
        const ks = (c.s.offer === "glass" ? ["glass"] : ["oil", "tires"]).filter((k) => !not.includes(k));
        if (ks.length) { c.s.checks = ks; c.s.extrasDone = "yes"; c.say("check_yes"); if (c.s.totalSaid) for (const k of ks) c.say(RESULT[k]); return; }
      }
      // "Nada más las llantas, el aceite no": the yes already answered
      if (c.s.extrasDone === "yes" && not.length) { c.s.checks = ((c.s.checks ?? []) as string[]).filter((k) => !not.includes(k)); return; }
      if (c.s.extrasDone === undefined) c.s.extrasDone = "no";
      c.say("ok_no");
    },
    more_no(c) {
      if (c.step === "extras" && c.s.extrasDone === undefined) { c.s.extrasDone = "no"; c.say("ok_no"); }
      if (c.step === "receipt" && c.s.receipt === undefined) { c.s.receipt = false; c.say("ok_no"); }
      if (c.step === "trouble" && !c.s.trouble) { c.s.troubleDone = true; c.say("all_good"); }
      if (c.step === "trouble_help") c.s.troubleDone = true;
      if (c.step === "anything") c.s.anythingDone = true;
    },
    more_no_ctx(c, slots, seg) { gas.handlers.more_no(c, slots, seg); },
    coffee_where(c) { c.say("coffee"); },
    restroom(c) { c.say("restroom"); },
    directions(c) { c.say("directions"); if (c.step === "anything") c.s.anythingDone = true; },
    air(c, slots, seg) {
      // before paying, air is one of her checks; with a flat tire it's her offer
      if (c.s.trouble === "flat" && !c.s.troubleDone) { c.s.troubleDone = true; c.say("inflate"); return; }
      if (c.s.pumpOn && !c.s.paid) { gas.handlers.check_order(c, slots, { ...seg, tags: [...seg.tags, "tires"] }); return; }
      c.say("air_line");
      if (c.step === "anything") c.s.anythingDone = true;
    },
    atm(c) { c.say("atm"); },
    trouble(c, _slots, seg) {
      if (c.s.trouble) return;
      c.s.trouble = seg.tags.includes("flat") ? "flat" : seg.tags.includes("other") ? "other" : "start";
      if (seg.tags.includes("battery")) c.s.battery = true;
      // told without her asking: she answers right away
      if (c.step !== "trouble") c.ask("trouble_help");
    },
    ask_mechanic(c, _slots, seg) {
      c.say(c.s.trouble === "flat" || seg.tags.includes("flat") ? "tire_shop" : "mechanic");
      if (c.s.trouble) c.s.troubleDone = true;
    },
    call_help(c, _slots, seg) {
      if (seg.tags.includes("grua")) c.say("tow");
      else if (c.s.trouble === "flat") c.say("inflate");
      else if (c.s.trouble === "other") c.say("mechanic");
      else c.say("jump");
      if (c.s.trouble) c.s.troubleDone = true;
    },
    receipt_ask(c, _slots, seg) {
      if (seg.tags.includes("factura")) {
        if (c.s.receipt === true) { c.say("factura"); return; }
        giveReceipt(c); c.say("factura_now"); return;
      }
      if (c.s.receipt === true) { c.say("ack"); return; }
      giveReceipt(c);
    },
    receipt_no_ctx(c) { if (c.s.receipt === undefined) { c.s.receipt = false; c.say("ok_no"); } },
    no_receipt(c) { if (c.s.receipt === undefined) { c.s.receipt = false; c.say("ok_no"); } },
    pay_card(c, _slots, seg) {
      if (seg.tags.includes("credit")) c.s.cardType = "credit";
      if (seg.tags.includes("debit")) c.s.cardType = "debit";
      choosePay(c, "card");
    },
    no_cash(c) { choosePay(c, "card"); },
    no_card(c) { choosePay(c, "cash"); },
    pay_cash(c) { choosePay(c, "cash"); },
    pay_dollars(c) { c.say("dollars"); },
    here_you_go(c, slots) {
      if (c.s.paid) { c.say("cash_thanks"); return; }
      if (!c.s.totalSaid) { c.say("not_yet"); return; }
      finishPay(c, c.s.method ?? "cash", slots.price as number | undefined, keepsChange(c));
    },
    tip(c, slots, seg) {
      if (c.s.tipHeard === c.heard) return; // "Aquí tiene, quédese con el cambio": already thanked
      c.s.tipHeard = c.heard;
      // "Quédese con el cambio" when paying: cash, and the change is hers
      if (c.s.totalSaid && !c.s.paid && !seg.tags.includes("h:tip_amount")) { c.s.tipped = true; finishPay(c, "cash", undefined, true); return; }
      if (c.s.tipped) { c.say("cash_thanks"); return; }
      c.s.tipped = true;
      c.event("pay", { method: "cash", tip: true, amount: slots.price });
      c.say("tip_thanks");
      if (c.s.paid) c.hold(); // no "anything else?" right after her thanks
    },
    credit_debit(c, _slots, seg) {
      if (c.s.cardType) return;
      if (seg.tags.includes("amb")) { c.say("which_card"); c.hold(); return; }
      c.s.cardType = seg.tags.includes("debit") ? "debit" : "credit";
      // "Pago con tarjeta, de débito": the card already went through
      if (c.s.paid && c.s.method === "card" && !c.s.cardDone) cardThrough(c);
    },
    // "¡Gracias!" after the payment: the conversation goes on to her next question (or the twist) and her goodbye
    g_thanks(c) {
      c.say("g_welcome");
      if (c.s.__finished) c.hold();
    },
  },

  finish: (c) => {
    c.complete();
    c.say(c.s.trouble === "flat" ? "trouble_bye_flat" : c.s.trouble ? "trouble_bye" : "bye");
    c.expect({
      id: "closing", hints: ["g_social", "tip"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }, { lt: "Give a tip", hint: "tip" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); },
    });
  },

  tests: [
    // how much: every hint pattern and more
    { say: "Lleno, por favor", intent: "fill", step: "order" },
    { say: "Lleno de magna, por favor", intent: "fill", slots: { grade: "magna" } },
    { say: "Quinientos pesos de magna, por favor", intent: "prepay", slots: { price: 50000, grade: "magna" } },
    { say: "Póngale quinientos, por favor", intent: "prepay", slots: { price: 50000 } },
    { say: "¿Me lo llena, por favor?", intent: "fill" },
    { say: "Necesito gasolina", intent: "want_gas", step: "order" },
    { say: "Llénelo de premium", intent: "fill", slots: { grade: "premium" } },
    { say: "llenalo", intent: "fill" },
    { say: "Doscientos de la verde", intent: "prepay", slots: { price: 20000, grade: "magna" } },
    { say: "Cárguele trescientos pesos", intent: "prepay", slots: { price: 30000 } },
    { say: "Quinientos", intent: "amount_ctx", step: "order", slots: { price: 50000 } },
    { say: "Como cuatrocientos", intent: "amount_ctx", step: "amount", slots: { price: 40000 } },
    { say: "Mejor lleno", intent: "fill", step: "amount" },
    { say: "Mejor trescientos", intent: "amount_change_ctx", step: "pump_on", slots: { price: 30000 } },
    // the fuel
    { say: "Magna", intent: "grade_ans", step: "grade", slots: { grade: "magna" } },
    { say: "De la roja", intent: "grade_ans", step: "grade", slots: { grade: "premium" } },
    { say: "Regular, por favor", intent: "grade_ans", step: "grade", slots: { grade: "magna" } },
    { say: "Premium no, magna", intent: "grade_ans", step: "grade", slots: { grade: "magna" } },
    { say: "¿Cuál me recomienda?", intent: "grade_q", step: "grade" },
    { say: "¿Tienen diésel?", intent: "grade_q" },
    { say: "¿A cómo está la magna?", intent: "gas_price_q" },
    { say: "¿Cuánto cuesta el galón?", intent: "gas_price_q" },
    { say: "¿Cuánto cuesta llenarlo?", intent: "gas_price_q", step: "amount", not: ["fill"] },
    // the pump at zero
    { say: "Espere, no está en ceros", intent: "zeros_ctx", step: "zeros" },
    { say: "¿La puede poner en ceros?", intent: "zeros_ctx", step: "zeros" },
    { say: "¿Está en ceros?", intent: "zeros_q" },
    { say: "Ya marca ciento cincuenta", intent: "zeros_ctx", step: "zeros" },
    // the checks
    { say: "Sí, revíseme las llantas, por favor", intent: "check_order", step: "extras" },
    { say: "Nada más el aceite, por favor", intent: "check_order", step: "extras" },
    { say: "¿Me limpia el parabrisas?", intent: "check_order" },
    { say: "Las llantas", intent: "check_ctx", step: "extras" },
    { say: "No, gracias, así está bien", intent: "more_no", step: "extras" },
    { say: "No hace falta", intent: "more_no_ctx", step: "extras" },
    // paying, the tip, the receipt
    { say: "Con tarjeta, por favor", intent: "pay_card", step: "pay" },
    { say: "¿Acepta tarjeta?", intent: "pay_card", step: "pay" },
    { say: "En efectivo", intent: "pay_cash", step: "pay" },
    { say: "Aquí tiene mil", intent: "here_you_go", step: "pay", slots: { price: 100000 } },
    { say: "Quédese con el cambio", intent: "tip", step: "pay" },
    { say: "Esto es para usted", intent: "tip" },
    { say: "Para su refresco", intent: "tip" },
    { say: "Le dejo veinte de propina", intent: "tip", slots: { price: 2000 } },
    { say: "¿Aceptan dólares?", intent: "pay_dollars" },
    { say: "De débito", intent: "credit_debit", step: "debit" },
    { say: "Crédito", intent: "credit_debit", step: "debit" },
    { say: "¿Me da el ticket, por favor?", intent: "receipt_ask" },
    { say: "¿Me puede dar factura?", intent: "receipt_ask" },
    { say: "¿Dónde pago?", intent: "pay_pump_q" },
    // questions
    { say: "¿Dónde está el baño?", intent: "restroom" },
    { say: "¿Cómo llego a la carretera?", intent: "directions" },
    { say: "¿Por dónde salgo para Tulum?", intent: "directions" },
    { say: "¿Dónde pongo aire?", intent: "air" },
    { say: "¿Hay un cajero por aquí?", intent: "atm" },
    { say: "Es todo, gracias", intent: "more_no", step: "anything" },
    // car trouble
    { say: "Mi carro no arranca", intent: "trouble", step: "trouble" },
    { say: "Tengo una llanta ponchada", intent: "trouble", step: "trouble" },
    { say: "Se me ponchó una llanta", intent: "trouble" },
    { say: "¿Hay un taller cerca?", intent: "ask_mechanic", step: "trouble_help" },
    { say: "¿Me puede pasar corriente?", intent: "call_help", step: "trouble_help" },
    { say: "¿Puede llamar a una grúa?", intent: "call_help", step: "trouble_help" },
    // tú to staff
    { say: "¿Me revisas el aceite?", intent: "check_order", step: "extras" },
    // learners' Spain forms are correct answers too: ponme, vale, el depósito, el coche, gasóleo, vosotros
    { say: "Vale, ponme lleno", intent: "fill", step: "order" },
    { say: "Lleno el depósito, por favor", intent: "fill" },
    { say: "El coche no arranca", intent: "trouble", step: "trouble" },
    { say: "Gasóleo", intent: "grade_ans", step: "grade", slots: { grade: "diesel" } },
    { say: "¿Tenéis baño?", intent: "restroom" },
    // never flip the meaning
    { say: "No lo llene", intent: "fill_no", step: "order", not: ["fill"] },
    { say: "Lleno no, nada más trescientos", intent: "amount_change_ctx", step: "order", slots: { price: 30000 }, not: ["fill"] },
    { say: "No quiero premium", intent: "grade_no", step: "grade", not: ["grade_ans"] },
    { say: "El aceite no, gracias", intent: "check_no", step: "extras", not: ["check_order", "check_ctx"] },
    { say: "No traigo efectivo", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "Con tarjeta no, en efectivo", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "No necesito ticket", intent: "no_receipt", step: "receipt", not: ["receipt_ask"] },
    { say: "Sí, está en ceros", intent: "zeros_q", step: "zeros", not: ["zeros_ctx"] },
    { say: "No es de crédito", intent: "credit_debit", step: "debit" },
    { say: "No tengo tarjeta", intent: "no_card", step: "pay", not: ["pay_card"] },
    { say: "No quiero premium, quiero magna", intent: "grade_ans", step: "grade", slots: { grade: "magna" } },
    { say: "No, quinientos no, trescientos", intent: "amount_change_ctx", step: "order", slots: { price: 30000 } },
    { say: "¿Es gratis?", intent: "cost_q", step: "extras" },
    { say: "No traigo cambio", intent: "no_change", step: "pay", not: ["here_you_go"] },
    { say: "Tengo un problema", intent: "trouble_vague", step: "trouble", not: ["trouble"] },
    // review: half a tank, corrections, one-segment debit, other trouble, near/far, the price difference
    { say: "Medio tanque, por favor", intent: "half_tank", step: "order" },
    { say: "No quiero lleno, quiero trescientos", intent: "amount_change_ctx", step: "order", slots: { price: 30000 }, not: ["fill"] },
    { say: "No lleno, quinientos", intent: "amount_change_ctx", step: "order", slots: { price: 50000 }, not: ["fill"] },
    { say: "Sí, pero no el aceite", intent: "check_no", step: "extras", not: ["check_order", "check_ctx"] },
    { say: "El aceite no, las llantas sí", intent: "check_order", step: "extras" },
    { say: "No, no hace falta revisar nada", intent: "check_no", step: "extras", not: ["check_order", "check_ctx"] },
    { say: "Pago con tarjeta de débito", intent: "pay_card", step: "pay" },
    { say: "Mi carro hace un ruido raro", intent: "trouble", step: "trouble" },
    { say: "Se me murió la batería", intent: "trouble", step: "trouble" },
    { say: "¿Está cerca la carretera?", intent: "far_q", step: "anything" },
    { say: "¿Cuál es la más barata?", intent: "grade_q", step: "grade" },
    { say: "Sí, todo bien", intent: "more_no", step: "trouble", not: ["trouble", "trouble_vague"] },
    // not understood
    { say: "banana parabrisas ventana", intent: "none" },
    { say: "Mi perro come llantas azules", intent: "none" },
    { say: "Quiero aprender a bailar salsa", intent: "none" },
  ],

  sims: [
    { name: "a full tank of regular, card",
      turns: ["¡Buenas tardes!", "Lleno de magna, por favor", "Sí, gracias", "Con tarjeta", "¡Gracias, adiós!"],
      auto: omit(AUTO, ["order", "pump_on", "pay"]), expect: { complete: true, state: { fill: true, grade: "magna", paid: true, method: "card" } },
      setup: (s) => { s.greetFill = false; s.zerosTwist = false; s.troubleTwist = false; s.askDebit = false; s.askReceipt = false; s.askAnything = false; } },
    { name: "questions, a change of mind, cash and a tip",
      turns: ["¿A cómo está la magna?", "Quinientos de magna, por favor", "Mejor lleno", "¿Dónde pago?", "Sí, revíseme las llantas, por favor",
        "¿Aceptan dólares?", "En efectivo", "Aquí tiene mil", "Esto es para usted", "¿Cómo llego a la carretera?", "¡Gracias, adiós!"],
      auto: omit(AUTO, ["order", "pump_on", "extras", "pay", "anything"]), expect: { complete: true, state: { fill: true, tipped: true, method: "cash" } },
      setup: (s) => { s.greetFill = false; s.zerosTwist = false; s.troubleTwist = false; s.askExtras = true; s.offer = "oil_tires"; s.askAnything = true; s.askReceipt = false; } },
    { name: "the pump isn't at zero (twist): the learner says so",
      turns: ["Trescientos de premium", "Espere, la bomba no está en ceros", "Gracias", "Tarjeta", "De débito", "¡Adiós!"],
      auto: omit(AUTO, ["order", "zeros", "pay", "debit"]), expect: { complete: true, state: { zerosDone: true, amount: 30000, grade: "premium", cardType: "debit" } },
      setup: (s) => { s.greetFill = false; s.zerosTwist = true; s.troubleTwist = false; s.askExtras = false; s.askDebit = true; } },
    { name: "the pump isn't at zero (twist): she catches it herself",
      turns: ["Doscientos, por favor", "La verde", "Sí", "Gracias", "Aquí tiene", "Para su refresco", "¡Gracias!"],
      auto: omit(AUTO, ["order", "grade", "zeros", "pay"]), expect: { complete: true, state: { zerosDone: true, tipped: true, amount: 20000 } },
      setup: (s) => { s.greetFill = false; s.zerosTwist = true; s.troubleTwist = false; s.askExtras = false; s.askReceipt = false; } },
    { name: "car won't start (twist): a jump",
      turns: ["Magna, por favor", "Como quinientos", "Sí", "Con tarjeta", "Mi carro no arranca", "¿Me puede pasar corriente?", "¡Muchas gracias!"],
      auto: omit(AUTO, ["order", "amount", "pump_on", "pay", "trouble", "trouble_help"]), expect: { complete: true, state: { trouble: "start", troubleDone: true, amount: 50000 } },
      setup: (s) => { s.greetFill = false; s.zerosTwist = false; s.troubleTwist = true; s.askDebit = false; } },
    { name: "a flat tire (twist): air, then the tire shop",
      turns: ["Lleno, por favor", "Magna", "Ok", "Efectivo", "Aquí tiene mil", "Tengo una llanta ponchada", "Sí, por favor", "¿Dónde está la vulcanizadora?", "¡Gracias, adiós!"],
      auto: omit(AUTO, ["order", "grade", "pump_on", "pay", "trouble", "trouble_help"]), expect: { complete: true, state: { trouble: "flat", troubleDone: true } },
      setup: (s) => { s.greetFill = false; s.zerosTwist = false; s.troubleTwist = true; } },
    { name: "short answers",
      turns: ["Sí", "Premium", "Sí", "No", "Efectivo", "Tenga", "No", "Gracias"],
      auto: omit(AUTO, ["order", "grade", "pump_on", "extras", "pay", "receipt"]), expect: { complete: true, state: { fill: true, grade: "premium", receipt: false } },
      setup: (s) => { s.greetFill = true; s.zerosTwist = false; s.troubleTwist = false; s.askExtras = true; s.askReceipt = true; s.askAnything = false; } },
    { name: "too much, then a full tank; no to premium; a receipt and the factura",
      turns: ["Dos mil pesos, por favor", "Sí, lleno", "No quiero premium", "Ok", "No traigo efectivo", "De crédito", "¿Me puede dar factura?", "¡Adiós!"],
      auto: omit(AUTO, ["order", "fill_offer", "pump_on", "pay", "debit"]), expect: { complete: true, state: { fill: true, grade: "magna", cardType: "credit", receipt: true } },
      setup: (s) => { s.greetFill = false; s.zerosTwist = false; s.troubleTwist = false; s.askExtras = false; s.askDebit = true; } },
    // review: a bill too small is never taken as payment; she says what's missing
    { name: "cash: too little, then enough",
      turns: ["Lleno de magna", "Ok", "En efectivo", "Aquí tiene quinientos", "Ah, perdón. Aquí tiene mil", "¡Gracias, adiós!"],
      auto: omit(AUTO, ["order", "pump_on", "pay"]), expect: { complete: true, state: { fill: true, paid: true, method: "cash" } },
      setup: (s) => { s.greetFill = false; s.zerosTwist = false; s.troubleTwist = false; s.askExtras = false; s.askReceipt = false; s.askAnything = false; } },
    { name: "more than a tank takes, debit in one go, only the tires",
      turns: ["Mil doscientos de magna", "Ok", "Sí, pero no el aceite", "Pago con tarjeta de débito", "¡Adiós!"],
      auto: omit(AUTO, ["order", "pump_on", "extras", "pay"]), expect: { complete: true, state: { amount: 120000, extrasDone: "yes", cardType: "debit", paid: true } },
      setup: (s) => { s.greetFill = false; s.zerosTwist = false; s.troubleTwist = false; s.askExtras = true; s.offer = "oil_tires"; s.askDebit = true; s.askReceipt = false; s.askAnything = false; } },
    { name: "car trouble (twist): not okay, a question, then the tow truck",
      turns: ["Quinientos de premium", "Ok", "Con tarjeta", "No", "Mi carro no arranca", "¿Está lejos el taller?", "Sí", "¿Puede llamar a una grúa?", "¡Gracias!"],
      auto: omit(AUTO, ["order", "pump_on", "pay", "trouble", "trouble_help"]), expect: { complete: true, state: { trouble: "start", troubleDone: true } },
      setup: (s) => { s.greetFill = false; s.zerosTwist = false; s.troubleTwist = true; s.askExtras = false; s.askDebit = false; s.askReceipt = false; } },
  ],
};

// ---------------------------------------------------------------------------

function setGrade(c: Ctx, id: string) {
  if (c.s.pumpOn) return;
  c.s.grade = id;
}

function setAmount(c: Ctx, cents: number | undefined) {
  if (!cents || cents < 2000) return;
  if (cents > MAX_AMOUNT) {
    c.say("too_much");
    c.expect({ id: "fill_offer", expects: ["fill", "amount_ctx", "prepay"], hints: ["order"], suggest: [{ lt: "Say yes (or another amount)", hint: "order" }],
      yes: (cc) => gas.handlers.fill(cc, {}, { intent: "fill", slots: {}, tags: [] }),
      no: (cc) => { cc.say("ask_amount"); cc.hold(); },
      ask: (cc) => cc.say("ask_amount") });
    return;
  }
  c.s.fill = false;
  c.s.amount = cents;
}

/** Fueling starts (after the pump was shown at zero). */
function startFueling(c: Ctx) {
  c.s.pumpOn = true;
  if (c.s.fill) c.say("fill_start"); else c.say("amount_start", { price: c.s.amount });
  c.event("fuel", { amount: c.s.amount, fill: !!c.s.fill, grade: c.s.grade });
}

/** The twist: the learner pointed it out (or asked). */
function zerosFix(c: Ctx, line: string) {
  c.s.zerosDone = true; c.s.zerosNoticed = true;
  c.say(line, { price: LAST_SALE });
  c.s.pumpOn = true;
  c.event("fuel", { amount: c.s.amount, fill: !!c.s.fill, grade: c.s.grade });
  if (!c.s.askExtras) c.hold();
}

/** The twist: the learner said okay; she sees it herself. */
function zerosSelf(c: Ctx) {
  if (c.s.zerosDone) return;
  c.s.zerosDone = true;
  c.say("zeros_self", { price: LAST_SALE });
  c.tip(TIPS.zeros);
  c.s.pumpOn = true;
  c.event("fuel", { amount: c.s.amount, fill: !!c.s.fill, grade: c.s.grade });
  if (!c.s.askExtras) c.hold();
}

/** "…, quédese con el cambio" said with the money. */
function keepsChange(c: Ctx) {
  return /qu[eé]d(ese|ate) con el cambio|el cambio es para (usted|ti)|no me d[eé] (el )?cambio/i.test(c.heard);
}

function cardThrough(c: Ctx) {
  c.s.cardDone = true;
  c.say(c.s.cardType === "debit" ? "pin" : "card_through");
}

function receiptOpen(c: Ctx) {
  return !!c.s.askReceipt && c.s.receipt === undefined;
}

function giveReceipt(c: Ctx) {
  if (c.s.receipt === true) return;
  c.s.receipt = true;
  c.say("receipt_here");
  c.event("give", { item: "receipt" });
}

function choosePay(c: Ctx, method: "card" | "cash") {
  if (c.s.paid) return;
  c.s.method = method;
  if (c.s.totalSaid) { if (method === "card") finishPay(c, method); else c.say("ack"); } // cash: she waits for the money
  else c.say(method === "card" ? "card_yes" : "cash_yes"); // asked before she's done: the total comes later
}

function finishPay(c: Ctx, method: "card" | "cash", given?: number, keepChange = false) {
  if (c.s.paid) return;
  const total = due(c);
  // a bill that doesn't cover it: she says what's missing and waits (never paid)
  if (method === "cash" && given && given < total) { c.s.method = "cash"; c.say("short", { total, price: total - given }); c.hold(); return; }
  c.s.paid = true;
  c.s.method = method;
  c.event("pay", { method, amount: total });
  c.complete();
  if (method === "card") {
    c.say("terminal");
    if (!c.s.askDebit || c.s.cardType) cardThrough(c);
    return;
  }
  if (keepChange) { c.s.tipped = true; c.s.tipHeard = c.heard; c.say("tip_thanks"); return; }
  if (given && given > total) c.say("change_is", { price: given - total });
  else if (total % 10000 !== 0 && !given) c.say("change_back");
  else c.say("cash_thanks");
}

export default gas;
