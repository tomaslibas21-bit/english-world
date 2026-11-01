// Song 66 "Keep the Change" → Puerto Colibrí: "¿Cuánto me cobra?"
// Don Rigo's taxi at the sitio (the taxi stand). Taxis here have no meter: you say where you're going and agree the
// fare before you get in, as on Mexico's Caribbean coast. The model for prices that are agreed (a fixed fare, a
// request for less), places ("al centro", "a la terminal" – the composer joins "a el" into "al"), where to stop,
// paying cash and keeping the change. Small talk: where are you from, is it your first time. After paying, the taxi
// takes the learner there (c.event("taxi-ride", { to: <location id> })). Mexican-only words have a neutral twin
// ("ahorita", "nomás", "prender el aire").

import type { Ctx, EntityDef, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";

// ---------------------------------------------------------------------------
// Places: Spanish head, English gloss, gender, location id, fare (cents of a peso). `def`: the article a place takes.

const D = (id: string, es: string, en: string, g: "m" | "f", loc: string, fare: number, forms: string[], extra: { art?: "" ; nat?: string } = {}) =>
  ent(id, es, en, g, { forms, art: extra.art ?? "", attrs: { loc, fare, nat: extra.nat } });

const DESTS: EntityDef[] = [
  D("centro", "centro", "center", "m", "town-square", 10000, ["el centro", "zocalo", "el zocalo", "la plaza", "plaza principal", "la plaza principal", "centro del pueblo"], { nat: "town center" }),
  D("hotel", "Hotel | Mar Azul", "Hotel | Blue Sea", "m", "hotel", 12000, ["hotel mar azul", "el hotel mar azul", "mar azul", "el mar azul"], { nat: "Hotel Mar Azul" }),
  D("aeropuerto", "aeropuerto", "airport", "m", "airport", 35000, ["el aeropuerto"]),
  D("terminal", "terminal", "bus station", "f", "station", 10000, ["la terminal", "terminal de autobuses", "la terminal de autobuses", "la central", "central de autobuses", "la central de autobuses", "la estacion"]),
  D("playa", "playa", "beach", "f", "the-pier", 12000, ["la playa", "el malecon", "malecon", "el muelle", "muelle"]),
  D("mercado", "mercado", "market", "m", "market", 10000, ["el mercado", "mercado municipal", "el mercado municipal"]),
  D("museo", "museo", "museum", "m", "museum", 12000, ["el museo", "museo de la costa maya"]),
  D("cafe", "Café | La Ceiba", "Café | The Ceiba", "m", "sunny-cup", 10000, ["cafe la ceiba", "el cafe la ceiba", "la ceiba"], { nat: "Café La Ceiba" }),
  D("banco", "banco", "bank", "m", "bank", 10000, ["el banco", "banco del puerto"]),
  D("farmacia", "farmacia", "pharmacy", "f", "pharmacy", 10000, ["la farmacia", "farmacia del puerto"]),
  D("clinica", "clínica", "clinic", "f", "clinic", 12000, ["la clinica", "hospital", "el hospital", "clinica familiar", "el doctor"]),
  D("renta", "renta | de | autos", "rental | of | cars", "f", "car-rental", 12000, ["la renta de autos", "renta de carros", "la renta de carros", "alquiler de autos", "el alquiler de autos"], { nat: "car rental" }),
];

/** Where the learner may say they're from (small talk). */
const COUNTRIES: EntityDef[] = [
  ent("usa", "Estados Unidos", "the United States", "m", { forms: ["los estados unidos", "usa", "eu", "e u", "america"], attrs: { far: true } }),
  ent("canada", "Canadá", "Canada", "m", { forms: ["canada"] }),
  ent("uk", "Inglaterra", "England", "f", { forms: ["inglaterra", "el reino unido", "reino unido", "londres", "escocia", "gales"] }),
  ent("ireland", "Irlanda", "Ireland", "f", { forms: ["irlanda"] }),
  ent("australia", "Australia", "Australia", "f", { forms: ["australia"] }),
  ent("nz", "Nueva Zelanda", "New Zealand", "f", { forms: ["nueva zelanda", "nueva zelandia"] }),
  ent("lithuania", "Lituania", "Lithuania", "f", { forms: ["lituania"] }),
];

const byId = (id: string) => DESTS.find((e) => e.id === id);
const fareOf = (c: Ctx) => (c.s.price ?? byId(c.s.dest)?.attrs?.fare ?? 0) as number;

const TAXI_AUTO: Record<string, string> = {
  dest: "Al centro, por favor", fare: "Sí, está bien", haggle: "Está bien", from: "Soy de Estados Unidos", first: "Sí, es mi primera vez",
  ac: "Sí, por favor", stop: "Aquí está bien", pay: "Aquí tiene", change: "Quédese con el cambio",
};

// ---------------------------------------------------------------------------

export const taxi: SituationDef = {
  id: "s66-taxi",
  song: 66,
  songTitle: "Keep the Change",
  title: { en: "¿Cuánto me cobra?", lt: "How much do you charge?" },
  topic: { en: "En taxi", lt: "Taking a taxi" },
  chapter: 1,
  order: 3,
  location: "taxi-stand",
  npc: "vinnie",
  goal: "Tell the driver where you're going, agree the fare before you get in, say where to stop, and pay.",
  intro: "The taxi stand (el sitio) on the main street. Taxis here have no meter: you say where you're going and agree the price first. Don Rigo knows every corner of town.",
  entities: { dest: DESTS, country: COUNTRIES },

  grammar: {
    macros: {
      to: "(a | al | a la | hasta | hacia)",
      take_me: "(me lleva | me puede llevar | me podria llevar | lleveme | me llevas #tip:tu_staff | llevame #tip:tu_staff | voy | quiero ir | necesito ir | vamos | voy para)",
    },
  },

  intents: {
    dest: { patterns: [
      "@to {dest} #h:d_to", "@take_me @to {dest} #h:d_take", "@take_me {dest}", "(voy | vamos | necesito ir | quiero ir) @to {dest} #h:d_need",
      "[es] @to {dest}", "{dest}", "para {dest}", "(al | a la) {dest} por favor", "(quiero | necesito) tomar un taxi @to {dest}",
    ] },
    ask_fare: { patterns: ["cuanto (me cobra | cobra | es | seria | cuesta) [@to {dest}] #h:f_cuanto", "cuanto (me cobra | cobra) hasta {dest}", "en cuanto (me lleva | sale) [@to {dest}]",
      "cuanto (es | cuesta) el viaje [@to {dest}]", "@take_me @to {dest} cuanto (me cobra | es)", "que precio [tiene | es] @to {dest}", "cuanto me cobras #tip:tu_staff"] },
    accept: { patterns: ["(esta bien | de acuerdo | perfecto | va | sale | ok) #h:f_ok", "(si | ok) vamos", "(esta bien | de acuerdo) vamos", "me parece bien", "si esta bien"] },
    haggle: { patterns: ["(me lo | me la) deja en {price} #h:f_haggle", "(lo | la) puede dejar en {price}", "(en | por) {price} [esta bien]", "(me hace | hay) [un] descuento", "(es | esta) (muy)? caro", "(mas barato | menos)", "(que tal | y) {price}"] },
    refuse: { patterns: ["(mejor | entonces) no [gracias]", "no gracias (busco otro | mejor otro)", "es mucho no gracias"] },
    from_ans: { patterns: ["(soy | yo soy | vengo) de {country} #h:st_from", "de {country}", "{country}", "(soy | yo soy) (estadounidense | americano | americana | gringo | gringa) #usa", "(soy | yo soy) (canadiense) #canada"] },
    first_yes: { patterns: ["(si | si si) (es | es mi) primera vez", "(es | es mi) primera vez #h:st_first", "si primera vez"] },
    first_no: { patterns: ["no ya (vine | estuve | he venido) [antes | aqui]", "(ya | no ya) (vine | he venido | estuve) [antes | aqui] #h:st_before", "no es la (segunda | tercera) vez", "vengo (cada ano | seguido)"] },
    ask_far: { patterns: ["(esta | queda) (lejos | cerca) #h:e_far", "cuanto (tiempo)? (se hace | tarda | tardamos | hacemos) #h:e_long", "cuanto (falta | nos falta)", "ya (casi)? llegamos"] },
    ac_on: { patterns: ["(puede | podria) (prender | encender | poner) el aire #h:c_ac", "(hace | tengo) (mucho)? calor", "(prenda | ponga | encienda) el aire"] },
    window: { patterns: ["(puedo | se puede) (abrir | bajar) la ventana #h:c_window"] },
    stop: { patterns: [
      "aqui (esta bien | por favor) #h:s_here", "(me puede dejar | dejeme | me deja) aqui #h:s_leave", "(me bajo | bajo) aqui", "(en | a) la esquina [por favor] #h:s_corner",
      "(enfrente | adelante | alla) [por favor]", "(enfrente | delante) del {dest}", "(pare | pareme | se puede parar) aqui", "(aqui | ahi) (nomas | mismo)", "aqui", "ahi esta bien",
    ] },
    pay_cash: { patterns: ["aqui tiene #h:p_here", "tenga", "aqui esta", "le pago en efectivo", "aqui tiene {price}", "tenga {price}"] },
    keep_change: { patterns: ["quedese con el cambio #h:p_keep", "(asi esta | asi) bien", "el cambio es para usted", "no me de cambio"] },
    pay_card: { patterns: ["(acepta | aceptan) tarjeta #h:p_card", "(puedo pagar | pago | le pago) con (tarjeta | el celular | mi celular)", "con (tarjeta | el celular)"] },
    ask_receipt: { patterns: ["(me da | me puede dar) (un)? (recibo | comprobante | ticket)", "(necesito | quisiera) (un)? (recibo | comprobante | ticket)"] },
    dest_unknown: { patterns: ["@to {w:any}", "@take_me @to {w:any}"] },
  },

  lines: {
    greet: [
      t("¡Buenas! | ¿A | dónde | {m:lo|f:la} | llevo?", "Hi! | To | where | you | I-take?", "Hi! Where can I take you?",
        { flags: { 3: "lo / la: “you” (usted) – lo for a man, la for a woman." } }),
      t("¡Buenas | tardes! | ¿A | dónde | vamos?", "Good | afternoon! | To | where | we-go?", "Good afternoon! Where to?"),
      t("¡Súbase! | ¿A | dónde | va?", "Get in! | To | where | you-go?", "Hop in! Where are you going?"),
    ],
    which_place: [
      t("¿A | qué | parte | {m:lo|f:la} | llevo?", "To | what | place | you | I-take?", "Where exactly shall I take you?", { flags: { 3: "lo / la: “you” (usted), for a man / a woman." } }),
    ],
    fare_is: [
      t("¿A | {X.the}? | Son | {$fare}.", "To | {X.the}? | That's | {$fare}.", "To the {X}? That's {$fare}."),
      t("{X.the}, | {$fare}.", "{X.the}, | {$fare}.", "The {X}: {$fare}."),
    ],
    fare_ok_q: [
      t("¿Le | parece | bien?", "(To) you | seems | good?", "Is that okay?"),
      t("¿Nos | vamos?", "(Ourselves) | we-go?", "Shall we go?"),
    ],
    fare_fixed: [
      t("Es | tarifa | fija, | {m:joven|f:joven}.", "It's | fare | fixed, | young man.", "It's a fixed fare, I'm afraid."),
    ],
    fare_lower: [
      t("Ándele | pues, | se lo | dejo | en | {$fare}.", "Go on | then, | it to you | I-leave | at | {$fare}.", "Oh, go on then, {$fare}.",
        { flags: { 0: "Mexican: ándele pues = oh, all right then." }, neutral: t("Bueno, | se lo | dejo | en | {$fare}.", "Okay, | it to you | I-leave | at | {$fare}.", "Okay then, {$fare}.") }),
    ],
    lets_go: [
      t("¡Vámonos!", "Let's go!", "Let's go!"),
      t("Perfecto. | Súbase.", "Perfect. | Get in.", "Perfect. Hop in."),
    ],
    refused: [t("Como | guste.", "As | you-like.", "As you like.")],
    ask_from: [
      t("¿Y | de | dónde | es | usted?", "And | from | where | are | you?", "So where are you from?"),
    ],
    from_reply: [
      t("¡Ah, | qué | bien! | ¿Es | su | primera | vez | en | Puerto | Colibrí?", "Oh, | how | nice! | Is it | your | first | time | in | Puerto | Colibrí?", "Oh, how nice! Is it your first time in Puerto Colibrí?"),
    ],
    from_far: [
      t("¡Uy, | de | muy | lejos! | ¿Es | su | primera | vez | aquí?", "Wow, | from | very | far! | Is it | your | first | time | here?", "Wow, that's a long way! Is it your first time here?"),
    ],
    first_reply: [
      t("¡Bienvenid{m:o|f:a}! | Le | va | a | encantar.", "Welcome! | (To) you | it's going | to | delight.", "Welcome! You're going to love it."),
    ],
    again_reply: [
      t("¡Qué | gusto! | Ya | conoce | el | pueblo | entonces.", "How | nice! | Already | you-know | the | town | then.", "Great! So you know the town already."),
    ],
    ask_ac: [
      t("¿Le | prendo | el | aire?", "(For) you | I-turn-on | the | AC?", "Shall I turn on the AC?",
        { flags: { 1: "Mexican: prender = turn on. Elsewhere: encender." }, neutral: t("¿Le | enciendo | el | aire?", "(For) you | I-turn-on | the | AC?", "Shall I turn on the AC?") }),
    ],
    ac_done: [t("Listo.", "Done.", "There you go.")],
    window_ok: [t("Sí, | claro.", "Yes, | sure.", "Sure, go ahead.")],
    far: [
      t("Son | como | diez | minutos.", "It's | about | ten | minutes.", "About ten minutes."),
      t("Está | cerca, | ahorita | llegamos.", "It's | close, | right now | we-arrive.", "It's close, we'll be there in a minute.",
        { flags: { 3: "Mexican: ahorita = in a moment." }, neutral: t("Está | cerca, | ya | llegamos.", "It's | close, | now | we-arrive.", "It's close, we'll be there in a minute.") }),
    ],
    arrived: [
      t("Ya | llegamos. | ¿Dónde | {m:lo|f:la} | dejo?", "Already | we-arrived. | Where | you | I-leave?", "Here we are. Where shall I drop you off?", { flags: { 3: "lo / la: “you” (usted), for a man / a woman." } }),
      t("Aquí | es. | ¿Le | paro | aquí?", "Here | it-is. | (For) you | I-stop | here?", "This is it. Shall I stop here?"),
    ],
    stopping: [t("Muy | bien.", "Very | good.", "Okay."), t("Perfecto, | aquí | le | paro.", "Perfect, | here | (for) you | I-stop.", "Sure, I'll stop here.")],
    say_fare: [
      t("Son | {$fare}, | por favor.", "That's | {$fare}, | please.", "That's {$fare}, please."),
      t("Serían | {$fare}.", "That would be | {$fare}.", "That'll be {$fare}."),
    ],
    cash_only: [
      t("Perdón, | nomás | efectivo.", "Sorry, | only | cash.", "Sorry, cash only.",
        { flags: { 1: "Mexican: nomás = only." }, neutral: t("Perdón, | solo | efectivo.", "Sorry, | only | cash.", "Sorry, cash only.") }),
    ],
    change_back: [t("Aquí tiene | su | cambio.", "Here's | your | change.", "Here's your change.")],
    exact: [t("¡Justo! | Gracias.", "Exact! | Thanks.", "Exactly right, thanks!")],
    thanks_tip: [t("¡Ay, | muchas | gracias!", "Oh, | many | thanks!", "Oh, thank you so much!")],
    receipt: [t("Claro, | aquí | tiene | su | recibo.", "Sure, | here | you-have | your | receipt.", "Sure, here's your receipt.")],
    bye: [
      t("¡Que | le | vaya | bien!", "(I hope) | (for) you | it-goes | well!", "Take care!"),
      t("¡Disfrute | Puerto | Colibrí!", "Enjoy | Puerto | Colibrí!", "Enjoy Puerto Colibrí!"),
    ],
    unknown_place: [t("Mmm, | no | conozco | ese | lugar. | ¿Me | dice | otro?", "Hmm, | not | I-know | that | place. | (To) me | you-tell | another?", "Hmm, I don't know that place. Somewhere else?")],
    ok: [t("Muy | bien.", "Very | good.", "Okay.")],
  },

  domains: {
    fare: () => {
      const s = new Set<number>();
      for (const d of DESTS) { const f = d.attrs!.fare as number; for (const x of [f, f - 2000, f - 1000]) s.add(x); }
      return [...s];
    },
  },

  hints: {
    dest: {
      lt: "Say where you're going", slot: "dest", examples: ["centro", "aeropuerto", "hotel", "playa"],
      items: [
        { id: "d_to", s: t("A | {X.the}, | por favor.", "To | {X.the}, | please.", "To the {X}, please.") },
        { id: "d_take", s: t("¿Me | lleva | a | {X.the}?", "Me | you-take | to | {X.the}?", "Could you take me to the {X}?") },
        { id: "d_need", s: t("Voy | a | {X.the}.", "I'm going | to | {X.the}.", "I'm going to the {X}.") },
      ],
    },
    fare: {
      lt: "Ask the price and agree it",
      items: [
        { id: "f_cuanto", s: t("¿Cuánto | me | cobra?", "How much | (to) me | you-charge?", "How much do you charge?"), note: "Ask before you get in: taxis here have no meter." },
        { id: "f_ok", s: t("Está bien, | vamos.", "Okay, | let's go.", "Okay, let's go.") },
        { id: "f_haggle", s: t("¿Me | lo | deja | en | cien?", "(To) me | it | you-leave | at | one hundred?", "Would you do it for a hundred?"), note: "Asking for less is fine; a fixed fare is fixed." },
      ],
    },
    talk: {
      lt: "Small talk",
      items: [
        { id: "st_from", s: t("Soy | de | Estados Unidos.", "I'm | from | the United States.", "I'm from the United States.") },
        { id: "st_first", s: t("Sí, | es | mi | primera | vez.", "Yes, | it's | my | first | time.", "Yes, it's my first time.") },
        { id: "st_before", s: t("No, | ya | vine | antes.", "No, | already | I-came | before.", "No, I've been here before.") },
        { id: "e_far", s: t("¿Está | lejos?", "Is it | far?", "Is it far?") },
        { id: "e_long", s: t("¿Cuánto | se | hace?", "How much | (itself) | it-takes?", "How long does it take?") },
        { id: "c_ac", s: t("¿Puede | prender | el | aire?", "Can you | turn on | the | AC?", "Could you turn on the AC?") },
        { id: "c_window", s: t("¿Puedo | abrir | la | ventana?", "Can I | open | the | window?", "Can I open the window?") },
      ],
    },
    stop: {
      lt: "Say where to stop",
      items: [
        { id: "s_here", s: t("Aquí | está bien, | gracias.", "Here | is fine, | thanks.", "Right here is fine, thanks.") },
        { id: "s_leave", s: t("Déjeme | aquí, | por favor.", "Leave me | here, | please.", "You can drop me off here, please.") },
        { id: "s_corner", s: t("En | la | esquina, | por favor.", "At | the | corner, | please.", "At the corner, please.") },
      ],
    },
    pay: {
      lt: "Pay",
      items: [
        { id: "p_here", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
        { id: "p_keep", s: t("Quédese | con | el | cambio.", "Keep | with | the | change.", "Keep the change.") },
        { id: "p_card", s: t("¿Acepta | tarjeta?", "Do you accept | card?", "Do you take cards?") },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With a driver, usted is more polite: “¿Me lleva…?”, “¿Cuánto me cobra?” (llevas / cobras is for friends).", better: "¿Me lleva al centro?" },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "dest", lt: "Say where you're going" },
    { step: "fare", lt: "Agree the fare before you go" },
    { step: "stop", lt: "Say where to stop" },
    { step: "pay", lt: "Pay" },
  ],
  steps: [
    { id: "dest", done: (c) => !!c.s.dest, ask: (c) => c.say("which_place"), expects: ["dest", "ask_fare"],
      suggest: [{ lt: "Say where you're going", hint: "dest", options: "dest" }, { lt: "Ask the price", hint: "fare" }] },
    { id: "fare", when: (c) => !!c.s.dest, done: (c) => !!c.s.agreed,
      ask: (c) => { if (!c.s.fareSaid) { c.s.fareSaid = true; c.say("fare_is", { X: c.s.dest, fare: fareOf(c) }); } c.say("fare_ok_q"); },
      expects: ["accept", "haggle", "refuse", "ask_fare"],
      suggest: [{ lt: "Agree the price (or ask for less)", hint: "fare" }],
      yes: (c) => { c.s.agreed = true; c.say("lets_go"); },
      no: (c) => { taxi.handlers.refuse(c, {}, { intent: "refuse", slots: {}, tags: [] }); } },
    { id: "from", when: (c) => !!c.s.agreed && !!c.s.askTalk && !c.s.arrived, done: (c) => !!c.s.talked,
      ask: (c) => c.say("ask_from"), expects: ["from_ans"], suggest: [{ lt: "Say where you're from", hint: "talk", options: "country" }] },
    { id: "first", when: (c) => !!c.s.agreed && !!c.s.askTalk && !!c.s.talked && c.s.first === undefined && !c.s.arrived, done: (c) => c.s.first !== undefined,
      ask: () => { /* asked by from_ans */ }, expects: ["first_yes", "first_no"], suggest: [{ lt: "Say whether it's your first time", hint: "talk" }],
      yes: (c) => { c.s.first = true; c.say("first_reply"); }, no: (c) => { c.s.first = false; c.say("again_reply"); } },
    { id: "ac", when: (c) => !!c.s.agreed && !!c.s.askAc && c.s.ac === undefined && !c.s.arrived, done: (c) => c.s.ac !== undefined,
      ask: (c) => c.say("ask_ac"), suggest: [{ lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => { c.s.ac = true; c.say("ac_done"); }, no: (c) => { c.s.ac = false; c.say("ok"); } },
    { id: "stop", when: (c) => !!c.s.agreed, done: (c) => !!c.s.stopped,
      ask: (c) => { c.s.arrived = true; c.say("arrived"); }, expects: ["stop"], suggest: [{ lt: "Say where to stop", hint: "stop" }],
      yes: (c) => { c.s.stopped = true; c.say("stopping"); } },
    { id: "pay", when: (c) => !!c.s.stopped, done: (c) => !!c.s.paid,
      ask: (c) => c.say("say_fare", { fare: fareOf(c) }), expects: ["pay_cash", "keep_change", "pay_card"], suggest: [{ lt: "Pay", hint: "pay" }] },
  ],

  init: (c) => {
    c.s.askTalk = c.chance(0.6);
    c.s.askAc = c.chance(0.35);
    c.s.haggleOk = c.chance(0.5);
    c.s.roundUp = c.chance(0.5);
  },

  start: (c) => {
    c.say("greet");
    c.hold();
  },

  handlers: {
    dest(c, slots) {
      const id = slots.dest as string;
      if (!byId(id)) { c.say("unknown_place"); c.hold(); return; }
      const changed = c.s.dest && c.s.dest !== id;
      c.s.dest = id;
      if (changed) { c.s.agreed = false; c.s.fareSaid = false; c.s.price = undefined; }
    },
    ask_fare(c, slots) {
      if (slots.dest) taxi.handlers.dest(c, slots, { intent: "dest", slots, tags: [] });
      if (!c.s.dest) { c.say("which_place"); c.hold(); return; }
      c.s.fareSaid = true;
      c.say("fare_is", { X: c.s.dest, fare: fareOf(c) });
    },
    accept(c) {
      if (!c.s.dest) { c.say("which_place"); c.hold(); return; }
      if (!c.s.agreed) { c.s.agreed = true; c.say("lets_go"); }
    },
    haggle(c, slots) {
      if (!c.s.dest) { c.say("which_place"); c.hold(); return; }
      const asked = slots.price as number | undefined;
      const fare = byId(c.s.dest)!.attrs!.fare as number;
      if (c.s.haggleOk && !c.s.haggled) {
        c.s.haggled = true; c.twist("haggle");
        // a little less, never below what was asked or by more than 20 pesos
        c.s.price = Math.max(asked ?? fare - 2000, fare - 2000);
        c.say("fare_lower", { fare: c.s.price });
      } else c.say("fare_fixed");
      c.expect({ id: "haggle", expects: ["accept", "refuse"], hints: ["fare"], suggest: [{ lt: "Agree (or say no)", hint: "fare" }],
        yes: (cc) => { cc.s.agreed = true; cc.say("lets_go"); }, no: (cc) => { taxi.handlers.refuse(cc, {}, { intent: "refuse", slots: {}, tags: [] }); },
        on: {
          accept: (cc) => { cc.s.agreed = true; cc.say("lets_go"); return true; },
          refuse: (cc) => { taxi.handlers.refuse(cc, {}, { intent: "refuse", slots: {}, tags: [] }); return true; },
        },
        ask: (cc) => cc.say("fare_ok_q") });
    },
    refuse(c) { c.say("refused"); c.end(); c.hold(); },
    from_ans(c, slots, seg) {
      c.s.talked = true;
      const id = (slots.country as string | undefined) ?? (seg.tags.includes("usa") ? "usa" : seg.tags.includes("canada") ? "canada" : undefined);
      c.s.from = id;
      c.say(id === "lithuania" || id === "australia" || id === "nz" ? "from_far" : "from_reply");
    },
    first_yes(c) { c.s.first = true; c.say("first_reply"); },
    first_no(c) { c.s.first = false; c.say("again_reply"); },
    ask_far(c) { c.say("far"); },
    ac_on(c) { c.s.ac = true; c.say("ac_done"); },
    window(c) { c.say("window_ok"); },
    stop(c) {
      if (!c.s.agreed) { c.say("fare_ok_q"); c.hold(); return; }
      c.s.arrived = true; c.s.stopped = true; c.say("stopping");
    },
    pay_cash(c, slots) {
      if (!c.s.stopped) { c.say("ok"); return; }
      if (c.s.paid) return;
      c.s.paid = true; c.event("pay", { method: "cash", amount: fareOf(c) });
      if (typeof slots.price === "number" && slots.price === fareOf(c)) c.say("exact");
      else c.say("change_back");
      ride(c);
    },
    keep_change(c) {
      if (!c.s.stopped) { c.say("ok"); return; }
      c.s.paid = true; c.s.tip = true; c.event("pay", { method: "cash", amount: fareOf(c) });
      c.say("thanks_tip");
      ride(c);
    },
    pay_card(c) { c.twist("cash_only"); c.say("cash_only"); },
    ask_receipt(c) { c.say("receipt"); c.event("give", { item: "receipt" }); },
    dest_unknown(c) { c.say("unknown_place"); c.hold(); },
  },

  finish: (c) => {
    if (!c.s.done) { c.s.done = true; c.complete(); }
    c.say("bye");
    c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: { g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); }, g_bye: (cc) => { cc.say("g_bye"); cc.end(); } },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // where to: every hint pattern and more
    { say: "Al centro, por favor", intent: "dest", slots: { dest: "centro" } },
    { say: "¿Me lleva al aeropuerto?", intent: "dest", slots: { dest: "aeropuerto" } },
    { say: "Voy a la terminal", intent: "dest", slots: { dest: "terminal" } },
    { say: "A la playa", intent: "dest", slots: { dest: "playa" } },
    { say: "Al Hotel Mar Azul, por favor", intent: "dest", slots: { dest: "hotel" } },
    { say: "Lléveme al mercado", intent: "dest", slots: { dest: "mercado" } },
    { say: "¿Me puede llevar a la clínica?", intent: "dest", slots: { dest: "clinica" } },
    { say: "Al zócalo", intent: "dest", slots: { dest: "centro" } },
    { say: "Necesito ir a la renta de autos", intent: "dest", slots: { dest: "renta" } },
    { say: "a el centro", intent: "dest", slots: { dest: "centro" } },
    { say: "¿Me llevas al centro?", intent: "dest" },
    // the fare
    { say: "¿Cuánto me cobra?", intent: "ask_fare", step: "fare" },
    { say: "¿Cuánto me cobra al aeropuerto?", intent: "ask_fare", slots: { dest: "aeropuerto" } },
    { say: "¿Cuánto es hasta el centro?", intent: "ask_fare", slots: { dest: "centro" } },
    { say: "¿En cuánto me lleva a la playa?", intent: "ask_fare", slots: { dest: "playa" } },
    { say: "Está bien, vamos", intent: "accept", step: "fare" },
    { say: "Va", intent: "accept", step: "fare" },
    { say: "¿Me lo deja en cien?", intent: "haggle", step: "fare", slots: { price: 10000 } },
    { say: "Es muy caro", intent: "haggle", step: "fare" },
    { say: "Mejor no, gracias", intent: "refuse", step: "fare" },
    // small talk
    { say: "Soy de Estados Unidos", intent: "from_ans", step: "from", slots: { country: "usa" } },
    { say: "De Canadá", intent: "from_ans", step: "from", slots: { country: "canada" } },
    { say: "Soy americana", intent: "from_ans", step: "from" },
    { say: "Sí, es mi primera vez", intent: "first_yes", step: "first" },
    { say: "No, ya vine antes", intent: "first_no", step: "first" },
    { say: "¿Está lejos?", intent: "ask_far" },
    { say: "¿Puede prender el aire?", intent: "ac_on" },
    { say: "Hace mucho calor", intent: "ac_on" },
    // stopping and paying
    { say: "Aquí está bien", intent: "stop", step: "stop" },
    { say: "Déjeme aquí, por favor", intent: "stop", step: "stop" },
    { say: "En la esquina", intent: "stop", step: "stop" },
    { say: "Me bajo aquí", intent: "stop", step: "stop" },
    { say: "Aquí tiene", intent: "pay_cash", step: "pay" },
    { say: "Tenga, cien pesos", intent: "pay_cash", step: "pay" },
    { say: "Quédese con el cambio", intent: "keep_change", step: "pay" },
    { say: "Así está bien", intent: "keep_change", step: "pay" },
    { say: "¿Acepta tarjeta?", intent: "pay_card", step: "pay" },
    // never flip the meaning
    { say: "No voy al centro", intent: "none" },
    { say: "No quiero ir al aeropuerto", intent: "none" },
    // not understood
    // learners' Spain forms are correct answers too: coger un taxi, vale, el móvil
    { say: "Quiero coger un taxi al centro", intent: "dest", slots: { dest: "centro" } },
    { say: "Vale, vamos", intent: "accept", step: "fare" },
    { say: "Pago con el móvil", intent: "pay_card", step: "pay" },
    { say: "aeropuerto banana ventana", intent: "none" },
    { say: "Mi perro se llama Max", intent: "none" },
  ],

  sims: [
    { name: "the center, agreed, cash", turns: ["Buenas tardes", "Al centro, por favor", "Está bien, vamos", "Aquí está bien", "Aquí tiene", "¡Gracias, adiós!"],
      expect: { complete: true, state: { dest: "centro", paid: true } }, auto: TAXI_AUTO, setup: (s) => { s.askTalk = false; s.askAc = false; } },
    { name: "price first, a lower fare, small talk", turns: ["¿Cuánto me cobra al aeropuerto?", "¿Me lo deja en trescientos treinta?", "Está bien", "Soy de Canadá", "No, ya vine antes", "Déjeme aquí, por favor", "Quédese con el cambio", "¡Adiós!"],
      expect: { complete: true, state: { dest: "aeropuerto", price: 33000, first: false } }, auto: TAXI_AUTO, setup: (s) => { s.askTalk = true; s.haggleOk = true; s.askAc = false; } },
    { name: "a fixed fare, the AC, a card first", turns: ["¿Me lleva a la playa?", "¿Me lo deja en cien?", "Va", "Sí, por favor", "¿Está lejos?", "En la esquina", "¿Acepta tarjeta?", "Aquí tiene", "¡Gracias!"],
      expect: { complete: true, state: { dest: "playa", ac: true } }, auto: TAXI_AUTO, setup: (s) => { s.askTalk = false; s.haggleOk = false; s.askAc = true; } },
  ],
};

/** Paid: the ride (the town takes the learner there). */
function ride(c: Ctx) {
  const loc = DESTS.find((d) => d.id === c.s.dest)?.attrs?.loc;
  if (loc) c.event("taxi-ride", { to: loc });
}

export default taxi;
