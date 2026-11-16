// A bonus conversation (off the route, not one of the 50): Kin, the alux who keeps the way into the grotto under
// Cenote Ka'an. Aluxes are small spirits of the Maya forest and cornfields, friendly and full of mischief, never
// scary. The learner swam through the cave's mouth; Kin stops them on the white path and asks who they are, where
// they come from and why they came. To pass, the learner must ask the way to the three talking stones (the mission
// says so); Kin answers with what the 3D grotto really has (src/game/cave): the white path is a sacbé; the first
// stone is to the left of the tree (the great ceiba in the middle of the hall, under the light), the second on the
// right, near the water, the third at the far end, beside the waterfall. Each stone says a sentence; the learner
// repeats it and the stone lights up; three lit stones open the way on. Side questions at any time: what an alux is,
// what a sacbé is, where am I, his name, does he live here, how old is he, his hat. Thanks or goodbye once all is said
// → "Pasa, pasa. ¡Y no toques mi sombrero!", c.event("alux-pass", { gate: "kin" }) and c.complete().
// A1–A2, short sentences, Kin says tú (npcs.ts informal). Lines take no country name (no clip per country), no numbers
// and no prices. Mexican-only words: "¡Órale!" (twin "¡Vaya!"); Spain's twins: the perfect for today's events.

import type { Ctx, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";
import { EDITION } from "@/edition";
import { WORLD_COUNTRIES, WORLD_NATIONALITIES } from "../countries";

const ALUX = "alux (plural aluxes): a small spirit of the Maya forest and cornfields, playful and mischievous.";
const SACBE = "sacbé: a white road the ancient Maya built (Maya for “white road”).";
const CEIBA = "ceiba: the kapok tree, sacred to the Maya: its roots reach the underworld, its branches the sky.";
const MILPA = "milpa: a Maya field of corn, beans and squash grown together.";
const CENOTE = "cenote: a natural pool in a limestone sinkhole, typical of the Yucatán.";
const GRUTA = "gruta: a grotto, a cave.";
const MONTE = "el monte: the wild bush or forest around a village.";

/** The countries offered as chips at "¿De dónde vienes?": a Lithuanian learner's own first (es-lt), else the list as it
 *  is (the English speakers' own come first in it). */
const COUNTRIES = EDITION.helper === "lt" ? [...WORLD_COUNTRIES.filter((e) => e.id === "lithuania"), ...WORLD_COUNTRIES.filter((e) => e.id !== "lithuania")] : WORLD_COUNTRIES;

const AUTO: Record<string, string> = {
  who: "Me llamo Sam", from: "Soy de Canadá", why: "Quiero ver la gruta",
};

/** Kin lets the learner pass: once name, where from and why are said and the way was asked. */
const ready = (c: Ctx) => !!(c.s.named && c.s.fromDone && c.s.whyDone && c.s.wayAsked);

function pass(c: Ctx) {
  if (c.s.passed) return;
  c.s.passed = true;
  // what to do with the stones, if the learner never asked
  if (!c.s.whatAsked) c.say("what_tip");
  c.say("pass");
  c.event("alux-pass", { gate: "kin" });
  c.complete();
  c.end();
  c.hold();
}

/** Too early to leave: what is still missing. */
function notYet(c: Ctx) {
  // only the way is missing: a nudge to ask it; else "Not yet", and his open question again
  if (c.s.named && c.s.fromDone && c.s.whyDone) { nudge(c); c.hold(); }
  else c.say("not_yet");
}

/** "Ask me where the stones are!", then a hint with the very words, in turn (never the same line twice running). */
function nudge(c: Ctx) {
  c.s.nudges = (c.s.nudges || 0) + 1;
  c.say(c.s.nudges % 2 ? "way_nudge" : "way_hint");
}

/** The whole way: the white path, then the three stones (a short reminder when it was already given). */
function giveWay(c: Ctx) {
  if (c.s.wayAsked) { c.say("dir_recap"); return; }
  c.s.wayAsked = true;
  c.say("dir_path");
  c.say("dir_first");
  c.say("dir_rest");
}

/** A reason for coming: his reaction to each one once ("Yes, yes, you told me" for the same one again). */
function reason(c: Ctx, line: string) {
  c.s.whyDone = true;
  const said: string[] = (c.s.reasons ??= []);
  if (said.includes(line)) { c.say("why_ok"); return; }
  said.push(line);
  c.say(line);
}

export const aluxKin: SituationDef = {
  id: "x02-alux-kin",
  bonus: true,
  // no course song: a string that names none (src/editions/es/content/radio.ts songOfSituation → null)
  song: "X02",
  songTitle: "Kin, el alux",
  title: { en: "Kin, el alux", lt: "The keeper of the grotto" },
  topic: { en: "En la gruta", lt: "In the grotto" },
  chapter: 9,
  order: 1,
  location: "gruta",
  npc: "alux_kin",
  mode: "talk",
  goal: "Tell the little alux who you are, where you're from and why you came, then ask him the way to the talking stones.",
  intro: "You swam through the cave's mouth at Cenote Ka'an and came up in a hidden grotto. On the white path stands a small figure in a straw hat, hands on his hips: an alux, a little Maya forest spirit. He doesn't look like he'll let you pass just like that.",
  entities: { country: COUNTRIES },

  grammar: {
    macros: {
      stones: "[las | unas | tres] piedras [que hablan | magicas | que cantan]",
      to_stones: "(a las | hasta las | hacia las) piedras [que hablan | magicas]",
    },
    slots: { nat: { lexicon: WORLD_NATIONALITIES } },
  },

  intents: {
    // --- who, where from -------------------------------------------------------------------------------------------
    name_ctx: { patterns: ["(me llamo #h:n_llamo | mi nombre es #h:n_nombre | soy #h:n_soy) {name}", "[yo] soy {name} [y tu]", "me dicen {name}", "(me llamo | soy) {name} mucho gusto"] },
    // a bare name ("Sam."), only at "¿Quién eres?"
    bare_name_ctx: { patterns: ["{name}"] },
    from_ctx: { patterns: [
      "(soy | vengo | somos | venimos) de {country} #h:f_soy", "de {country}", "{country}", "(vivo | vivimos) en {country}",
      "(soy | somos) {country:nat}", "(vengo | vine) desde {country}", "(soy | vengo) de (muy)? lejos de {country}",
      "no (soy | vengo) de {bad:country} (sino de | soy de | vengo de) {country}",
      "(soy | vengo | somos | venimos) de {w:any} #unknown",
    ] },
    // "del pueblo", "de Puerto Colibrí", "de arriba"
    from_town_ctx: { patterns: [
      "(soy | vengo | somos | venimos) (del pueblo | de puerto colibri | de arriba | de alla arriba | del cenote) #h:f_pueblo",
      "(del pueblo | de puerto colibri | de arriba | de alla arriba | del cenote)", "(vivo | vivimos) (en el pueblo | en puerto colibri | alla arriba | arriba)",
      "(vine | vengo | he venido) nadando [del cenote | desde el cenote]",
    ] },
    // --- why --------------------------------------------------------------------------------------------------------
    why_see: { patterns: [
      "(quiero | vengo a | vine a | he venido a | quisiera) (ver | conocer | visitar | explorar) [la] (gruta | cueva) #h:w_see",
      "(para | a) (ver | conocer | visitar | explorar) [la] (gruta | cueva)", "(quiero | vengo a | vine a) (ver | conocer | explorar) (este lugar | el lugar | todo)",
      "(soy | vengo como) (turista | explorador | exploradora)", "me gustan las (grutas | cuevas)",
    ] },
    why_learn: { patterns: [
      "(quiero | vengo a | vine a | he venido a) (aprender | practicar) [el] espanol #h:w_learn", "para (aprender | practicar) [el] espanol",
      "(estoy aprendiendo | aprendo) espanol", "(quiero | vengo a) hablar espanol",
    ] },
    why_stones: { patterns: [
      "(busco | estoy buscando | vengo a buscar | vine a buscar | he venido a buscar) @stones #h:w_stones",
      "(vengo | vine | he venido) por @stones", "(quiero | vengo a | vine a) (ver | encontrar | escuchar | oir) @stones", "por @stones", "@stones",
    ] },
    why_curious: { patterns: ["(tengo | por) curiosidad #h:w_curious", "(nada mas | solo | pura) (curiosidad | por curiosidad)", "(soy | estoy) (curioso | curiosa)", "tenia curiosidad"] },
    why_lost: { patterns: ["(estoy | ando) (perdido | perdida) #h:w_lost", "me (perdí | he perdido)", "no se donde estoy", "creo que (estoy perdido | estoy perdida | me perdí)"] },
    // any other reason, only at "¿Por qué viniste?"
    why_other_ctx: { patterns: ["(quiero | vengo a | vine a | he venido a | vine para | vengo para | para) {w:any}", "porque {w:any}", "(estaba | estoy) nadando"] },
    // --- the way ----------------------------------------------------------------------------------------------------
    ask_way: { patterns: [
      "por donde se va [@to_stones] #h:a_por_donde", "(donde | en donde) (estan | quedan) @stones #h:a_donde", "(como | por donde) (llego | voy | se llega) [@to_stones] #h:a_como",
      "(me dices | me puedes decir | puedes decirme | me dice | me puede decir | sabes) (donde estan | por donde se va a | como llego a) @stones",
      "(quiero | necesito) (saber | encontrar) (donde estan @stones | el camino | las piedras)", "(cual es | me dices | me ensenas) el camino [@to_stones]",
      "por donde (voy | sigo | camino)", "(a donde | adonde | hacia donde) (voy | tengo que ir)", "donde (estan | quedan)", "por donde",
      "(y)? (las | donde las) piedras", "(como | donde) (las encuentro | encuentro las piedras)",
    ] },
    // "¿Y la segunda?", "¿Dónde está la tercera piedra?"
    ask_stone: { patterns: [
      "[y] (la | donde esta la | donde queda la) primera [piedra] #p1 #h:a_first", "[y] (la | donde esta la | donde queda la) segunda [piedra] #p2 #h:a_second",
      "[y] (la | donde esta la | donde queda la) tercera [piedra] #p3 #h:a_third", "[y] (la | donde esta la) (ultima | otra) [piedra] #p3",
      "(y)? la piedra (numero)? (uno #p1 | dos #p2 | tres #p3)",
    ] },
    // "Ya sé dónde están": he wants to be asked all the same
    know_way: { patterns: ["ya (se | sé | lo se | lo sé | conozco) (donde estan @stones | el camino | donde estan)", "ya (se | sé) donde (estan | quedan) [las piedras]", "(ya)? (se | sé | conozco) el camino"] },
    ask_tree: { patterns: ["(que | cual) arbol", "(cual | que) es el arbol", "donde esta el arbol", "que es (una | la) ceiba", "(es)? la ceiba", "el arbol grande"] },
    ask_far: { patterns: ["(esta | estan | queda | quedan) (lejos | cerca)", "es lejos", "(esta | queda) muy lejos", "es (mucho | muy largo) el camino"] },
    ask_what: { patterns: [
      "que hago con [las] piedras #h:t_hago", "que (hago | tengo que hacer | debo hacer) [con ellas | ahi | alli | despues]", "y (luego | despues | entonces) que (hago)? #h:t_luego",
      "para que (son | sirven) [las piedras]", "que hacen las piedras", "como (funcionan | se usan) [las piedras]", "que dicen las piedras",
    ] },
    // --- side questions ---------------------------------------------------------------------------------------------
    q_alux: { patterns: ["que es un alux #h:q_alux", "que (son | es) (los | un) (alux | aluxes)", "(eres | son | sois) (un alux | aluxes)", "que eres [tu]", "que cosa eres", "que es un aluxe"] },
    q_sacbe: { patterns: ["que es (un | el) (sacbe | sacbé) #h:q_sacbe", "que es (el | este) camino blanco", "que significa (sacbe | sacbé)", "(sacbe | sacbé)"] },
    q_place: { patterns: ["(donde | en donde) (estoy | estamos) #h:q_place", "que es este lugar #h:q_lugar", "que lugar es este", "como se llama este lugar", "que es (esto | aqui)", "(que | cual) es esta (gruta | cueva)"] },
    q_name: { patterns: ["como te llamas #h:q_name", "cual es tu nombre", "como se llama usted", "(y tu | tu) como te llamas", "tienes nombre"] },
    q_who: { patterns: ["quien eres [tu] #h:q_who", "y tu quien eres", "quien es usted"] },
    q_live: { patterns: ["(vives | vive | viven | vivis) aqui #h:q_live", "(donde | en donde) (vives | vive)", "(esta | aqui) es tu casa", "aqui (vives | vive)"] },
    q_age: { patterns: ["cuantos anos tienes #h:q_age", "cuantos anos tiene", "que edad tienes", "eres (muy)? (viejo | joven)"] },
    q_hat: { patterns: ["(me gusta | que bonito | que lindo | que padre) [es] tu sombrero", "(puedo tocar | puedo ver | me prestas) tu sombrero", "por que (llevas | tienes | usas) sombrero"] },
    ask_pass: { patterns: ["(puedo | me dejas | me deja | podemos) (pasar | entrar | seguir)", "(dejame | deja) (pasar | entrar)", "ya puedo pasar"] },
    // "No, es todo" at "¿Algo más?"
    more_no_ctx: { patterns: ["(es todo | eso es todo | nada mas | ninguna | ninguna mas | ya es todo) #h:m_todo", "no (tengo | hay) (mas | otra | otras) (preguntas | pregunta)", "ya no (tengo preguntas)?"] },
    // "Está bien, gracias" / "Estoy bien" at "¿Algo más?": nothing more
    more_ok_ctx: { patterns: ["(esta | todo esta) bien [gracias] #h:m_ok", "(estoy | todo) bien [gracias]", "(asi | asi esta) bien [gracias]", "(muy)? bien gracias"] },
  },

  lines: {
    halt: [t("¡Alto | ahí! | ¿Quién | eres?", "Stop | there! | Who | are-you?", "Stop right there! Who are you?")],
    halt_again: [t("¡Alto | ahí! | Ah, | eres | tú | otra vez. | ¿Quién | eres?", "Stop | there! | Oh, | it's | you | again. | Who | are-you?", "Stop right there! Oh, it's you again. Who are you, now?")],
    ask_name: [t("¿Cómo | te llamas?", "How | are-you-called?", "What's your name?")],
    ask_name_back: [t("¿Y | tú? | ¿Cómo | te llamas?", "And | you? | How | are-you-called?", "And you? What's your name?")],
    name_ok: [
      t("¡Mucho gusto! | Aquí | casi | nunca | viene | nadie.", "Nice to meet you! | Here | almost | never | comes | nobody.", "Nice to meet you! Hardly anyone ever comes down here.",
        { flags: { 5: "Spanish doubles the negative: nunca … nadie = never … anybody." } }),
      t("¡Qué | bonito | nombre! | Mucho gusto.", "What | pretty | name! | Nice to meet you.", "What a lovely name! Nice to meet you."),
    ],
    ask_from: [t("¿Y | de | dónde | vienes?", "And | from | where | you-come?", "And where are you from?")],
    ask_from_again: [t("Entonces, | ¿de | dónde | eres?", "So, | from | where | are-you?", "So, where are you from?")],
    from_far: [t("¡Uy, | de | muy | lejos! | Bienvenid{m:o|f:a} | a | mi | gruta.", "Wow, | from | very | far! | Welcome | to | my | grotto.", "Wow, from far away! Welcome to my grotto.")],
    from_near: [t("Ah, | eso | no | está | tan | lejos. | Bienvenid{m:o|f:a}.", "Oh, | that | not | is | so | far. | Welcome.", "Oh, that's not so far. Welcome.")],
    from_mexico: [t("¡Ah, | de | México! | Entonces | ya | sabes | quiénes | somos | los | aluxes.", "Oh, | from | Mexico! | Then | already | you-know | who | we-are | the | aluxes.",
      "Oh, from Mexico! Then you already know who we aluxes are.", { flags: { 9: ALUX } })],
    from_town: [t("¡Ah, | del | pueblo | de | arriba! | Allá | arriba | hay | mucho | ruido.", "Oh, | from-the | town | of | above! | There | above | there is | a lot of | noise.",
      "Oh, from the town up there! It's so noisy up there.")],
    from_other: [t("¡Qué | bien! | Bienvenid{m:o|f:a} | a | mi | gruta.", "How | nice! | Welcome | to | my | grotto.", "How nice! Welcome to my grotto.")],
    ask_why: [
      t("¿Y | por qué | viniste?", "And | why | you-came?", "And why did you come?",
        { spain: t("¿Y | por qué | has venido?", "And | why | have-you-come?", "And why did you come?") }),
      t("¿Y | qué | te | trae | por | aquí?", "And | what | you | brings | around | here?", "And what brings you here?"),
    ],
    why_see: [t("¡Órale! | Es | la | gruta | más | bonita | del | mundo. | Bueno... | es | la | única | que | conozco.",
      "Wow! | It's | the | grotto | most | beautiful | of-the | world. | Well... | it's | the | only one | that | I-know.",
      "Wow! It's the most beautiful grotto in the world. Well… it's the only one I know.",
      { flags: { 0: "Mexican: ¡órale! = wow / all right!" },
        neutral: t("¡Vaya! | Es | la | gruta | más | bonita | del | mundo. | Bueno... | es | la | única | que | conozco.",
          "Wow! | It's | the | grotto | most | beautiful | of-the | world. | Well... | it's | the | only one | that | I-know.",
          "Wow! It's the most beautiful grotto in the world. Well… it's the only one I know.") })],
    why_learn: [t("¡Qué | bien! | Aquí | abajo | hasta | las | piedras | hablan | español.", "How | nice! | Here | below | even | the | stones | speak | Spanish.",
      "Great! Down here even the stones speak Spanish.")],
    why_stones: [t("¡Shhh! | Es | un | secreto... | Pero | bueno, | te | voy | a | ayudar.", "Shhh! | It's | a | secret... | But | okay, | you | I'm-going | to | help.",
      "Shhh! That's a secret… But all right, I'll help you.")],
    why_curious: [t("La | curiosidad | es | buena... | casi | siempre. | ¡Je, | je!", "The | curiosity | is | good... | almost | always. | Hee, | hee!",
      "Curiosity is a good thing… almost always. Hee hee!", { flags: { 0: "Spanish uses the article for things in general: la curiosidad = curiosity." } })],
    why_lost: [t("¿{m:Perdido|f:Perdida}? | Aquí | nadie | se pierde... | bueno, | casi | nadie.", "Lost? | Here | nobody | gets lost... | well, | almost | nobody.",
      "Lost? Nobody gets lost down here… well, almost nobody.")],
    why_other: [t("Ah, | muy | bien.", "Oh, | very | good.", "Oh, all right.")],
    // a reason after the reason was given
    why_ok: [t("Sí, | sí, | ya | me | dijiste.", "Yes, | yes, | already | (to) me | you-told.", "Yes, yes, you told me.",
      { spain: t("Sí, | sí, | ya | me lo | has dicho.", "Yes, | yes, | already | it to me | you've-said.", "Yes, yes, you told me.") })],
    // "No sé" at "¿Por qué viniste?"
    why_help: [t("¿No sabes? | Yo | creo | que | buscas | las | piedras | que | hablan.", "You don't know? | I | think | that | you-look-for | the | stones | that | talk.",
      "You don't know? I think you're looking for the talking stones.")],
    stones_intro: [t("Para | pasar, | tienes | que | encontrar | tres | piedras | que | hablan.", "To | pass, | you-have | to | find | three | stones | that | talk.",
      "To get past, you have to find three stones that talk.")],
    way_again: [t("¿No | me | vas | a | preguntar | dónde | están | las | piedras?", "Not | (to) me | you're-going | to | ask | where | are | the | stones?",
      "Aren't you going to ask me where the stones are?", { flags: { 0: "¿No me vas a…?: “aren't you going to…?”" } })],
    way_nudge: [t("¡Pregúntame | dónde | están | las | piedras! | Yo | lo | sé | todo.", "Ask me | where | are | the | stones! | I | it | know | all.",
      "Ask me where the stones are! I know everything.", { flags: { 6: "lo … todo: “everything” (lo is part of the phrase)." } })],
    way_hint: [t("Te | ayudo: | dime | «¿Dónde | están | las | piedras?».", "You | I-help: | tell me | “Where | are | the | stones?”.", "Here's a hint: say “Where are the stones?”")],
    not_yet: [t("Todavía | no. | Primero, | contesta | mis | preguntas.", "Still | not. | First, | answer | my | questions.", "Not yet. First, answer my questions.")],
    // the way, true to the 3D grotto
    dir_path: [t("Sigue | el | camino | blanco. | Es | un | sacbé, | un | camino | maya | muy | viejo.", "Follow | the | path | white. | It's | a | sacbé, | a | road | Maya | very | old.",
      "Follow the white path. It's a sacbé, a very old Maya road.", { flags: { 6: SACBE } })],
    dir_first: [t("La | primera | piedra | está | a la izquierda | del | árbol.", "The | first | stone | is | to the left | of-the | tree.", "The first stone is to the left of the tree.")],
    dir_rest: [t("La | segunda, | a la derecha, | cerca | del | agua. | Y | la | tercera, | al fondo, | junto | a | la | cascada.",
      "The | second, | to the right, | near | the | water. | And | the | third, | at the back, | next | to | the | waterfall.",
      "The second one's on the right, near the water. And the third is at the far end, by the waterfall.")],
    dir_second: [t("La | segunda | está | a la derecha, | cerca | del | agua.", "The | second | is | to the right, | near | the | water.", "The second one's on the right, near the water.")],
    dir_third: [t("La | tercera | está | al fondo, | junto | a | la | cascada.", "The | third | is | at the back, | next | to | the | waterfall.", "The third one's at the far end, by the waterfall.")],
    // a short reminder when the way is asked again
    dir_recap: [t("Por | el | camino | blanco: | a la izquierda | del | árbol, | a la derecha | cerca | del | agua, | y | al fondo, | junto | a | la | cascada.",
      "Along | the | path | white: | to the left | of-the | tree, | to the right | near | the | water, | and | at the back, | next | to | the | waterfall.",
      "Along the white path: left of the tree, right near the water, and at the far end, by the waterfall.")],
    dir_tree: [t("La | ceiba | grande, | en | medio | de | la | sala, | debajo | de | la | luz. | Es | el | árbol | sagrado | de | los | mayas.",
      "The | ceiba | big, | in | middle | of | the | hall, | under | of | the | light. | It's | the | tree | sacred | of | the | Maya.",
      "The big ceiba tree, in the middle of the hall, under the light. It's the Maya's sacred tree.", { flags: { 1: CEIBA, 9: "debajo de: under (de, “of”, has no English word here)." } })],
    dir_far: [t("No, | está | muy | cerca. | La | gruta | es | pequeña... | ¡como | yo!", "No, | it's | very | close. | The | grotto | is | small... | like | me!", "No, it's really close. The grotto is small… like me!")],
    // volunteered on the way out, when the learner never asked
    what_tip: [t("Ah, | y | escucha | bien | cada | piedra: | repite | su | frase, | y | se enciende.", "Oh, | and | listen | well | each | stone: | repeat | its | sentence, | and | it-lights-up.",
      "Oh, and listen carefully to each stone: say its sentence back, and it lights up.", { flags: { 4: "escucha … cada piedra: listen to each stone (no word for “to”)." } })],
    what_do: [t("Escúchalas. | Cada | piedra | dice | una | frase.", "Listen to them. | Each | stone | says | a | sentence.", "Listen to them. Each stone says a sentence.")],
    what_do_2: [t("Repítela, | y | la | piedra | se enciende. | Con | las | tres | encendidas, | se abre | el | camino.",
      "Repeat it, | and | the | stone | lights up. | With | the | three | lit, | opens | the | way.",
      "Say it back, and the stone lights up. When all three are lit, the way opens.")],
    // side questions
    i_am: [t("Soy | Kin, | un | alux. | Cuido | la | entrada | de | la | gruta.", "I-am | Kin, | an | alux. | I-guard | the | entrance | of | the | grotto.", "I'm Kin, an alux. I guard the way into the grotto.", { flags: { 3: ALUX } })],
    my_name: [t("Me llamo | Kin. | Kin | es | “sol” | en | maya.", "My name is | Kin. | Kin | is | “sun” | in | Maya.", "My name's Kin. Kin means “sun” in Maya.")],
    q_alux: [t("Un | alux | es | un | pequeño | guardián | del | monte | y | de | la | milpa. | Somos | pequeños, | pero | muy | traviesos.",
      "An | alux | is | a | little | guardian | of-the | forest | and | of | the | cornfield. | We-are | small, | but | very | mischievous.",
      "An alux is a little guardian of the forest and the cornfields. We're small, but very mischievous.", { flags: { 1: ALUX, 7: MONTE, 11: MILPA } })],
    q_sacbe: [t("Un | sacbé | es | un | camino | blanco | de | los | mayas. | En | maya, | “sac” | es | blanco | y | “be” | es | camino.",
      "A | sacbé | is | a | road | white | of | the | Maya. | In | Maya, | “sac” | is | white | and | “be” | is | road.",
      "A sacbé is a white road of the Maya. In Maya, “sac” means white and “be” means road.", { flags: { 1: SACBE } })],
    q_place: [t("Estás | en | la | gruta | de | los | aluxes, | debajo | del | cenote.", "You-are | in | the | grotto | of | the | aluxes, | under | the | cenote.",
      "You're in the aluxes' grotto, under the cenote.", { flags: { 3: GRUTA, 6: ALUX, 9: CENOTE } })],
    q_live: [t("¡Claro! | Vivo | aquí | desde | hace | muchos, | muchos | años.", "Of course! | I-live | here | since | ago | many, | many | years.", "Of course! I've lived here for many, many years.",
      { flags: { 3: "desde hace: “for” a length of time up to now, with the present tense." } })],
    q_age: [t("¿Yo? | Tengo... | ¡mil | años! | O | dos | mil. | Ya | no me acuerdo.", "Me? | I-have... | a thousand | years! | Or | two | thousand. | Already | I don't remember.",
      "Me? I'm… a thousand years old! Or two thousand. I don't remember anymore.", { flags: { 1: "Age with tener: tengo … años = I'm … years old." } })],
    q_hat: [t("¡Gracias! | Pero | mi | sombrero | no se toca. | ¡Nunca!", "Thanks! | But | my | hat | isn't touched. | Never!", "Thanks! But nobody touches my hat. Ever!")],
    // after the way: anything else?
    ask_more: [
      t("¿Tienes | otra | pregunta?", "You-have | another | question?", "Any other questions?"),
      t("¿Algo | más?", "Anything | else?", "Anything else?"),
    ],
    more_yes: [t("¡Pregunta, | pregunta!", "Ask, | ask!", "Go on, ask!")],
    pass: [t("Pasa, | pasa. | ¡Y | no toques | mi | sombrero!", "Go through, | go through. | And | don't touch | my | hat!", "Go on, go on through. And don't touch my hat!")],
  },

  hints: {
    name: {
      lt: "Say who you are",
      items: [
        { id: "n_soy", s: t("Soy | {$name}.", "I'm | {$name}.", "I'm {$name}.") },
        { id: "n_llamo", s: t("Me llamo | {$name}.", "My name is | {$name}.", "My name is {$name}.") },
        { id: "n_nombre", s: t("Mi | nombre | es | {$name}.", "My | name | is | {$name}.", "My name is {$name}.") },
      ],
    },
    from: {
      lt: "Say where you're from", slot: "country",
      // (Lithuanian learners see their own country first, as in the town: s69; English speakers, theirs)
      examples: EDITION.helper === "lt" ? ["lithuania", "usa", "canada"] : ["usa", "canada", "uk"],
      items: [
        { id: "f_soy", s: t("Soy | de | {X}.", "I'm | from | {X}.", "I'm from {X}.") },
        { id: "f_soy", s: t("Vengo | de | {X}.", "I-come | from | {X}.", "I'm from {X}.") },
        { id: "f_pueblo", s: t("Vengo | del | pueblo.", "I-come | from-the | town.", "I'm from the town up there.") },
      ],
    },
    why: {
      lt: "Say why you came",
      items: [
        { id: "w_see", s: t("Quiero | ver | la | gruta.", "I-want | to see | the | grotto.", "I want to see the grotto.") },
        { id: "w_learn", s: t("Vengo | a | aprender | español.", "I-come | to | learn | Spanish.", "I came to learn Spanish.") },
        { id: "w_stones", s: t("Busco | las | piedras | que | hablan.", "I-look-for | the | stones | that | talk.", "I'm looking for the talking stones.") },
        { id: "w_curious", s: t("Tengo | curiosidad.", "I-have | curiosity.", "I'm curious.") },
        { id: "w_lost", s: t("Estoy | {m:perdido|f:perdida}.", "I'm | lost.", "I'm lost.") },
      ],
    },
    way: {
      lt: "Ask the way to the stones",
      items: [
        { id: "a_donde", s: t("¿Dónde | están | las | piedras?", "Where | are | the | stones?", "Where are the stones?") },
        { id: "a_por_donde", s: t("¿Por | dónde | se va | a | las | piedras?", "Through | where | one goes | to | the | stones?", "Which way to the stones?", { flags: { 2: "se va: “one goes”, the usual way to ask for directions." } }) },
        { id: "a_como", s: t("¿Cómo | llego | a | las | piedras?", "How | I-get | to | the | stones?", "How do I get to the stones?") },
        { id: "a_second", s: t("¿Y | la | segunda?", "And | the | second?", "And the second one?") },
        { id: "a_third", s: t("¿Dónde | está | la | tercera | piedra?", "Where | is | the | third | stone?", "Where's the third stone?") },
        { id: "a_first", s: t("¿Y | la | primera?", "And | the | first?", "And the first one?") },
      ],
    },
    // his "¿Tienes otra pregunta?" / "¿Algo más?": a no, or a yes and the question itself
    more: {
      lt: "Answer Kin",
      items: [
        { id: "m_no", s: t("No, | gracias.", "No, | thanks.", "No, thanks.") },
        { id: "m_ok", s: t("Está bien, | gracias.", "It's fine, | thanks.", "I'm fine, thanks.") },
        { id: "m_todo", s: t("No, | eso | es | todo.", "No, | that | is | all.", "No, that's all.") },
        { id: "m_si", s: t("Sí: | ¿qué | hago | con | las | piedras?", "Yes: | what | I-do | with | the | stones?", "Yes: what do I do with the stones?") },
      ],
    },
    what: {
      lt: "Ask what to do with them",
      items: [
        { id: "t_hago", s: t("¿Qué | hago | con | las | piedras?", "What | I-do | with | the | stones?", "What do I do with the stones?") },
        { id: "t_luego", s: t("¿Y | luego | qué | hago?", "And | then | what | I-do?", "And then what do I do?") },
      ],
    },
    ask: {
      lt: "Ask Kin about himself and this place",
      items: [
        { id: "q_alux", s: t("¿Qué | es | un | alux?", "What | is | an | alux?", "What's an alux?", { flags: { 3: ALUX } }) },
        { id: "q_who", s: t("¿Quién | eres?", "Who | are-you?", "Who are you?") },
        { id: "q_name", s: t("¿Cómo | te llamas?", "How | are-you-called?", "What's your name?") },
        { id: "q_place", s: t("¿Dónde | estoy?", "Where | I-am?", "Where am I?") },
        { id: "q_lugar", s: t("¿Qué | es | este | lugar?", "What | is | this | place?", "What is this place?") },
        { id: "q_sacbe", s: t("¿Qué | es | un | sacbé?", "What | is | a | sacbé?", "What's a sacbé?", { flags: { 3: SACBE } }) },
        { id: "q_live", s: t("¿Vives | aquí?", "You-live | here?", "Do you live here?") },
        { id: "q_age", s: t("¿Cuántos | años | tienes?", "How many | years | you-have?", "How old are you?") },
      ],
    },
  },

  mission: [
    { step: "who", lt: "Say who you are" },
    { step: "from", lt: "Say where you're from" },
    { step: "why", lt: "Say why you came" },
    { step: "way", lt: "Ask the way to the stones" },
    // optional: it goes when he lets the learner pass (he tells them then)
    { lt: "Ask what to do with them", optional: true, when: (c) => !c.s.passed, done: (c) => !!c.s.whatAsked },
    { lt: "Say thank you", done: (c) => !!c.s.passed },
  ],

  steps: [
    { id: "who", done: (c) => !!c.s.named,
      ask: (c) => c.say(c.s.kinSaid ? "ask_name_back" : "ask_name"),
      expects: ["name_ctx", "bare_name_ctx", "from_ctx", "from_town_ctx"],
      suggest: [{ lt: "Say who you are", hint: "name" }, { lt: "Ask who he is", hint: "ask" }] },
    { id: "from", done: (c) => !!c.s.fromDone,
      ask: (c) => { c.say(c.s.fromAsked ? "ask_from_again" : "ask_from"); c.s.fromAsked = true; },
      expects: ["from_ctx", "from_town_ctx"],
      suggest: [{ lt: "Say where you're from", hint: "from", options: "country" }] },
    { id: "why", done: (c) => !!c.s.whyDone,
      ask: (c) => c.say("ask_why"),
      expects: ["why_see", "why_learn", "why_stones", "why_curious", "why_lost", "why_other_ctx"],
      suggest: [{ lt: "Say why you came", hint: "why" }],
      help: (c) => { c.s.whyDone = true; c.say("why_help"); } },
    { id: "way", done: (c) => !!c.s.wayAsked,
      ask: (c) => { if (c.s.wayIntro) c.say("way_again"); else { c.s.wayIntro = true; c.say("stones_intro"); } },
      expects: ["ask_way", "ask_stone", "ask_what"],
      suggest: [{ lt: "Ask the way to the stones", hint: "way" }, { lt: "Ask Kin a question", hint: "ask" }],
      // "Sí" / "No" / "Vale" to "Aren't you going to ask me…?": he waits for the question
      yes: (c) => { nudge(c); c.hold(); },
      no: (c) => { nudge(c); c.hold(); } },
    { id: "more", done: (c) => !!c.s.passed,
      ask: (c) => c.say("ask_more"),
      expects: ["more_no_ctx", "more_ok_ctx", "ask_what", "ask_stone"],
      // what answers his question first: "No, gracias", or "Sí" and the question
      suggest: [{ lt: "Answer Kin", hint: "more" }, { lt: "Ask what to do with the stones", hint: "what" }, { lt: "Ask Kin a question", hint: "ask" }],
      hints: ["g_social"],
      // "Vale, gracias" / "Bueno, gracias" closes; a bare "Sí" asks for the question
      yes: (c) => { if (/gracias/i.test(c.heard)) { c.say("g_welcome"); pass(c); return; } c.say("more_yes"); c.hold(); },
      no: (c) => { pass(c); } },
  ],

  init: (c) => {
    c.s.named = false;
  },

  start: (c) => {
    c.say(c.visits >= 1 ? "halt_again" : "halt");
    c.hold();
  },

  handlers: {
    name_ctx(c) { if (!c.s.named) { c.s.named = true; c.say("name_ok"); } },
    bare_name_ctx(c) { if (!c.s.named) { c.s.named = true; c.say("name_ok"); } },
    from_ctx(c, slots, seg) {
      if (c.s.fromDone) return;
      c.s.fromDone = true;
      const id = slots.country as string | undefined;
      const e = id ? WORLD_COUNTRIES.find((x) => x.id === id) : undefined;
      if (!e || seg.tags.includes("unknown")) { c.say("from_other"); return; }
      c.say(id === "mexico" ? "from_mexico" : e.attrs?.near ? "from_near" : "from_far");
    },
    from_town_ctx(c) { if (c.s.fromDone) return; c.s.fromDone = true; c.say("from_town"); },
    why_see(c) { reason(c, "why_see"); },
    why_learn(c) { reason(c, "why_learn"); },
    why_stones(c) { reason(c, "why_stones"); },
    why_curious(c) { reason(c, "why_curious"); },
    why_lost(c) { reason(c, "why_lost"); },
    why_other_ctx(c) { reason(c, "why_other"); },
    // "¿Dónde estamos?" heard as "¿Dónde están?" (a person slip the engine forgives): where we are
    ask_way(c) { if (/\b(estamos|estoy)\b/.test(c.heard.toLowerCase())) { c.say("q_place"); return; } giveWay(c); },
    ask_stone(c, _slots, seg) {
      // asking for one stone first is asking the way too: the white path, then that stone
      if (!c.s.wayAsked) { c.s.wayAsked = true; c.say("dir_path"); }
      if (seg.tags.includes("p1")) c.say("dir_first");
      else if (seg.tags.includes("p2")) c.say("dir_second");
      else c.say("dir_third");
    },
    know_way(c) { c.say(c.s.wayAsked ? "why_other" : "way_again"); c.hold(); },
    ask_tree(c) { c.say("dir_tree"); },
    ask_far(c) { c.say("dir_far"); },
    ask_what(c) { c.s.whatAsked = true; c.say("what_do"); c.say("what_do_2"); },
    q_alux(c) { c.say("q_alux"); },
    q_sacbe(c) { c.say("q_sacbe"); },
    q_place(c) { c.say("q_place"); },
    q_name(c) { c.s.kinSaid = true; c.say("my_name"); },
    q_who(c) { c.s.kinSaid = true; c.say("i_am"); },
    q_live(c) { c.say("q_live"); },
    q_age(c) { c.say("q_age"); },
    q_hat(c) { c.say("q_hat"); },
    ask_pass(c) { if (ready(c)) pass(c); else { notYet(c); } },
    more_no_ctx(c) { pass(c); },
    more_ok_ctx(c) { c.say("g_welcome"); pass(c); },
    // thanks and goodbye: he lets the learner through once all is said; before that, what is missing
    g_thanks(c) {
      if (ready(c)) { c.say("g_welcome"); pass(c); return; }
      c.say("g_welcome");
      notYet(c);
    },
    g_bye(c) {
      if (ready(c)) { pass(c); return; }
      notYet(c);
    },
  },

  tests: [
    // who
    { say: "Soy Sam", intent: "name_ctx", step: "who" },
    { say: "Me llamo Ana", intent: "name_ctx", step: "who", slots: { name: "Ana" } },
    { say: "Mi nombre es Laura", intent: "name_ctx", step: "who" },
    { say: "Ryan", intent: "bare_name_ctx", step: "who" },
    { say: "Hola, me llamo Tom, mucho gusto", intent: "name_ctx", step: "who" },
    // where from
    { say: "Soy de Canadá", intent: "from_ctx", step: "from", slots: { country: "canada" } },
    { say: "Vengo de Estados Unidos", intent: "from_ctx", step: "from", slots: { country: "usa" } },
    { say: "Soy de Lituania", intent: "from_ctx", step: "from", slots: { country: "lithuania" } },
    { say: "Soy inglesa", intent: "from_ctx", step: "from", slots: { country: "uk" } },
    { say: "De México", intent: "from_ctx", step: "from", slots: { country: "mexico" } },
    { say: "Vengo de Espana", intent: "from_ctx", step: "from", slots: { country: "spain" } },
    { say: "Soy del pueblo", intent: "from_town_ctx", step: "from" },
    { say: "Vengo de Puerto Colibrí", intent: "from_town_ctx", step: "from" },
    { say: "Vine nadando desde el cenote", intent: "from_town_ctx", step: "from" },
    { say: "No soy de Estados Unidos, soy de Canadá", intent: "from_ctx", step: "from", slots: { country: "canada", bad: "usa" } },
    // why
    { say: "Quiero ver la gruta", intent: "why_see", step: "why" },
    { say: "He venido a conocer la cueva", intent: "why_see", step: "why" },
    { say: "Vengo a aprender español", intent: "why_learn", step: "why" },
    { say: "Quiero practicar espanol", intent: "why_learn", step: "why" },
    { say: "Busco las piedras que hablan", intent: "why_stones", step: "why" },
    { say: "Vengo por las piedras", intent: "why_stones", step: "why" },
    { say: "Tengo curiosidad", intent: "why_curious", step: "why" },
    { say: "Por curiosidad", intent: "why_curious", step: "why" },
    { say: "Estoy perdida", intent: "why_lost", step: "why" },
    { say: "Me he perdido", intent: "why_lost", step: "why" },
    { say: "Vine a nadar", intent: "why_other_ctx", step: "why" },
    // the way
    { say: "¿Dónde están las piedras?", intent: "ask_way", step: "way" },
    { say: "¿Por dónde se va a las piedras?", intent: "ask_way", step: "way" },
    { say: "¿Cómo llego a las piedras?", intent: "ask_way", step: "way" },
    { say: "¿Me dices dónde están las piedras?", intent: "ask_way", step: "way" },
    { say: "¿Por dónde voy?", intent: "ask_way", step: "way" },
    { say: "¿Y la segunda?", intent: "ask_stone", step: "more" },
    { say: "¿Dónde está la tercera piedra?", intent: "ask_stone", step: "more" },
    { say: "¿Y la primera?", intent: "ask_stone" },
    { say: "¿Qué árbol?", intent: "ask_tree" },
    { say: "¿Está lejos?", intent: "ask_far" },
    { say: "Ya conozco el camino", intent: "know_way", not: ["ask_way"] },
    { say: "¿Dónde estamos?", intent: "q_place", step: "more" },
    { say: "¿Qué hago con las piedras?", intent: "ask_what", step: "more" },
    { say: "¿Y luego qué hago?", intent: "ask_what" },
    // side questions
    { say: "¿Qué es un alux?", intent: "q_alux", not: ["g_meaning"] },
    { say: "¿Eres un alux?", intent: "q_alux" },
    { say: "¿Qué es un sacbé?", intent: "q_sacbe", not: ["g_meaning"] },
    { say: "¿Qué es una ceiba?", intent: "ask_tree", not: ["g_meaning"] },
    { say: "¿Dónde estoy?", intent: "q_place" },
    { say: "¿Qué es este lugar?", intent: "q_place" },
    { say: "¿Cómo te llamas?", intent: "q_name" },
    { say: "¿Quién eres tú?", intent: "q_who" },
    { say: "¿Vives aquí?", intent: "q_live" },
    { say: "¿Cuántos años tienes?", intent: "q_age" },
    { say: "Me gusta tu sombrero", intent: "q_hat" },
    { say: "¿Puedo pasar?", intent: "ask_pass" },
    // Spain's forms: vosotros, the perfect, vale
    { say: "¿Vivís aquí?", intent: "q_live" },
    { say: "¿Sois aluxes?", intent: "q_alux" },
    { say: "He venido a ver la gruta", intent: "why_see", step: "why" },
    // negation and meaning safety
    { say: "No quiero ver la gruta", intent: "none", not: ["why_see"], step: "why" },
    { say: "No tengo curiosidad", intent: "none", not: ["why_curious"], step: "why" },
    { say: "No estoy perdido", intent: "none", not: ["why_lost"], step: "why" },
    { say: "No sé dónde estoy", intent: "why_lost", not: ["q_place"] },
    { say: "No tengo más preguntas", intent: "more_no_ctx", step: "more", not: ["ask_what"] },
    // the answers suggested to "¿Tienes otra pregunta?"
    { say: "No, eso es todo", intent: "more_no_ctx", step: "more" },
    { say: "Está bien, gracias", intent: "more_ok_ctx", step: "more", not: ["ask_what"] },
    { say: "Sí: ¿qué hago con las piedras?", intent: "ask_what", step: "more" },
    // not understood
    { say: "La pizza tiene queso", intent: "none" },
    { say: "Mi coche es azul", intent: "none" },
    { say: "El martes juega el equipo", intent: "none" },
  ],

  sims: [
    { name: "happy path", turns: ["Me llamo Sam", "Soy de Canadá", "Quiero ver la gruta", "¿Dónde están las piedras?", "¿Qué hago con las piedras?", "No, gracias. ¡Muchas gracias!"],
      expect: { complete: true, state: { named: true, fromDone: true, whyDone: true, wayAsked: true, whatAsked: true, passed: true } }, auto: AUTO },
    { name: "questions first, each stone, then thanks", turns: ["¿Quién eres?", "Soy Ana", "¿Qué es un alux?", "Vengo de Lituania", "¿Dónde estoy?", "Busco las piedras que hablan",
      "¿Por dónde se va?", "¿Y la segunda?", "¿Dónde está la tercera piedra?", "¿Qué árbol?", "¿Cuántos años tienes?", "¡Gracias, Kin!"],
      expect: { complete: true, state: { kinSaid: true, passed: true } }, auto: AUTO },
    { name: "short answers, from the town, no reason", turns: ["Tom", "Del pueblo", "No sé", "¿Cómo llego a las piedras?", "Gracias"],
      expect: { complete: true, state: { whyDone: true, passed: true } }, auto: AUTO },
    { name: "too early: thanks and asking to pass before the way", turns: ["Soy Laura", "De México", "Tengo curiosidad", "¡Gracias!", "¿Puedo pasar?", "Vale", "¿Dónde están las piedras?", "¡Adiós!"],
      expect: { complete: true, state: { passed: true } }, auto: AUTO },
    { name: "the suggested answers to “¿Tienes otra pregunta?”: no, thanks", turns: ["Soy Sam", "Soy de Lituania", "Quiero ver la gruta", "¿Dónde están las piedras?", "No, gracias."],
      expect: { complete: true, state: { passed: true } }, auto: AUTO },
    { name: "… it's fine, thanks", turns: ["Soy Sam", "Soy de Lituania", "Quiero ver la gruta", "¿Dónde están las piedras?", "Está bien, gracias."],
      expect: { complete: true, state: { passed: true } }, auto: AUTO },
    { name: "… that's all", turns: ["Soy Sam", "Soy de Lituania", "Quiero ver la gruta", "¿Dónde están las piedras?", "No, eso es todo."],
      expect: { complete: true, state: { passed: true } }, auto: AUTO },
    { name: "… yes, and the question; then no", turns: ["Soy Sam", "Soy de Lituania", "Quiero ver la gruta", "¿Dónde están las piedras?", "Sí: ¿qué hago con las piedras?", "No, gracias."],
      expect: { complete: true, state: { whatAsked: true, passed: true } }, auto: AUTO },
    { name: "Spain's Spanish, lost", turns: ["Me llamo Pablo", "Soy de España", "Me he perdido", "¿Vivís aquí?", "¿Cómo llego a las piedras?", "¿Está lejos?", "Vale, muchas gracias"],
      expect: { complete: true }, auto: AUTO },
  ],
};

export default aluxKin;
