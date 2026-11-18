// Bonus (off the route): Nikté, the alux of the riddles, in the grotto under Cenote Ka'an.
// Nikté ("flower" in Maya) sits in the middle of a bridge of roots and lets the learner cross after two riddles guessed.
// The riddles are traditional Spanish folk riddles (the same in Mexico, Latin America and Spain), whose answers are A1
// nouns; the learner guesses with a thing from a list of entities, as at Doña Licha's stall (s32-mercado). A different
// pair comes first on each visit (the ones asked last time go to the end). Nobody stays on the bridge: a "no sé" brings
// a clue, a second one the answer and the next riddle, and after three riddles not guessed she lets the learner through
// anyway, with a wink. Crossing: c.event("alux-pass", { gate: "nikte" }); the task is complete when the learner thanks
// her (or says goodbye) once she has let them cross.
// No song: `song` is a string ("X03"), as the advanced conversations' are, so the radio finds none (songOfSituation).
// Nikté says tú (npcs.ts: informal, informalSpain). No Mexican-only words, so no neutral twins; Spain's twins where
// Spain says it with the perfect ("¡Lo has adivinado!", "Ya te he dado una pista").

import type { Ctx, EntityDef, SituationDef, Suggestion } from "@/content/types";
import type { ConvCtx } from "@/convo/dialogue";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Things a learner may guess: the riddles' answers and the likeliest wrong guesses (each riddle's chips show its answer
// among three of them).

export const THINGS: EntityDef[] = [
  // the answers
  ent("platano", "plátano", "banana", "m", { pl: "plátanos", ltPl: "bananas", forms: ["platanos", "banana", "bananas", "banano", "bananos"] }),
  ent("aguacate", "aguacate", "avocado", "m", { pl: "aguacates", ltPl: "avocados", forms: ["aguacates", "palta", "paltas"] }),
  ent("pera", "pera", "pear", "f", { pl: "peras", ltPl: "pears", forms: ["peras"] }),
  ent("reloj", "reloj", "clock", "m", { pl: "relojes", ltPl: "clocks", forms: ["relojes", "reloj de pared", "un reloj de pulsera"] }),
  ent("viento", "viento", "wind", "m", { pl: "vientos", ltPl: "winds", forms: ["el aire", "aire", "la brisa", "brisa"] }),
  ent("luna", "luna", "moon", "f", { pl: "lunas", ltPl: "moons", forms: ["lunas", "la luna llena"] }),
  // wrong guesses
  ent("oro", "oro", "gold", "m", { art: "" }),
  ent("plata", "plata", "silver", "f", { art: "" }),
  ent("mango", "mango", "mango", "m", { pl: "mangos", ltPl: "mangoes" }),
  ent("limon", "limón", "lime", "m", { pl: "limones", ltPl: "limes", forms: ["limones", "lima"] }),
  ent("agua", "agua", "water", "f", { art: "", def: "el" }),
  ent("casa", "casa", "house", "f", { pl: "casas", ltPl: "houses" }),
  ent("corazon", "corazón", "heart", "m", { pl: "corazones", ltPl: "hearts" }),
  ent("manzana", "manzana", "apple", "f", { pl: "manzanas", ltPl: "apples" }),
  ent("naranja", "naranja", "orange", "f", { pl: "naranjas", ltPl: "oranges" }),
  ent("libro", "libro", "book", "m", { pl: "libros", ltPl: "books" }),
  ent("gato", "gato", "cat", "m", { pl: "gatos", ltPl: "cats" }),
  ent("pajaro", "pájaro", "bird", "m", { pl: "pájaros", ltPl: "birds", forms: ["pajaros", "ave", "un ave", "pajarito"] }),
  ent("avion", "avión", "plane", "m", { pl: "aviones", ltPl: "planes", forms: ["aviones", "avioneta"] }),
  ent("nube", "nube", "cloud", "f", { pl: "nubes", ltPl: "clouds" }),
  ent("sol", "sol", "sun", "m", { pl: "soles", ltPl: "suns" }),
  ent("estrella", "estrella", "star", "f", { pl: "estrellas", ltPl: "stars" }),
];

interface Riddle { id: string; choices: string[] }
/** The riddles: the answer is the thing with the riddle's id; `choices` are the chips (the answer among three others). */
const RIDDLES: Riddle[] = [
  { id: "platano", choices: ["oro", "platano", "plata", "limon"] },
  { id: "aguacate", choices: ["agua", "casa", "aguacate", "corazon"] },
  { id: "pera", choices: ["manzana", "limon", "pera", "naranja"] },
  { id: "reloj", choices: ["libro", "reloj", "gato", "casa"] },
  { id: "viento", choices: ["pajaro", "avion", "viento", "nube"] },
  { id: "luna", choices: ["sol", "luna", "estrella", "nube"] },
];
const RIDDLE_IDS = RIDDLES.map((r) => r.id);

/** Two right answers cross the bridge; three riddles not guessed, and she lets you cross anyway. */
const TO_PASS = 2;
const MAX_MISSED = 3;

const fold = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const NIKTE_AUTO: Record<string, string> = { hint_offer: "Sí, por favor" };

// ---------------------------------------------------------------------------

export const aluxNikte: SituationDef = {
  id: "x03-alux-nikte",
  bonus: true,
  song: "X03",
  songTitle: "",
  title: { en: "Nikté y las adivinanzas", lt: "The alux of the riddles" },
  topic: { en: "Las adivinanzas de Nikté", lt: "Nikté's riddles" },
  chapter: 9,
  order: 2,
  location: "gruta",
  npc: "alux_nikte",
  mode: "talk",
  goal: "Guess two of Nikté's riddles, so that she lets you cross her bridge. Ask for a clue if you need one.",
  intro: "Deeper in the grotto, a bridge of roots crosses the dark water. In the middle of it sits a small figure with a flower in her braid: Nikté, an alux. She won't move until you play her game.",
  entities: { thing: THINGS },

  grammar: {
    macros: {
      // "es el plátano", "¿es un plátano?", "creo que es la pera", "a lo mejor es el viento"
      maybe: "(seria | sera | puede ser | a lo mejor es | tal vez es | tal vez sea | quiza es | quiza sea | es que es | entonces es)",
    },
  },

  intents: {
    ready: { patterns: [
      "estoy (listo | lista | preparado | preparada) #h:ready_listo", "[si] (ya | bueno | claro) (estoy | ando) (listo | lista)",
      "[si] (vamos | va | dale | sale | venga) [a jugar] #h:ready_vamos", "(si | bueno | claro) vamos #h:ready_si",
      "dime [la adivinanza | la primera] #h:ready_dime", "(adelante | empieza | empecemos | juguemos | preguntame | pregunta)",
      "[si] (quiero | queremos) (jugar | pasar | adivinar)", "vamos a (jugar | empezar)", "[a ver] dimela", "listo", "lista",
      "(cual es | dime) la (adivinanza | primera)", "(a ver | ok) la adivinanza",
    ] },
    not_ready: { patterns: ["(todavia | aun) no [estoy (listo | lista)]", "(todavia | aun) no quiero jugar", "no estoy (listo | lista | preparado | preparada)", "(espera | esperame) [un momento | un poco | un poquito]", "no quiero jugar [ahora]"] },
    // the riddle's answer (only while a riddle waits for one)
    guess_ctx: { patterns: [
      "es {thing} #h:g_es", "es (un | una) {thing} #h:g_un", "[yo] creo que (es | sea) {thing} #h:g_creo",
      "(pienso | me parece) que es {thing}", "@maybe {thing}", "la respuesta es {thing}", "ya (se | lo se) [es] {thing}",
      "{thing}", "(el | la | un | una) {thing}", "(ah | ya) {thing}", "(ah | ya) (el | la | un | una) {thing}", "a poco es {thing}",
      // "¿Es la luna, verdad?", "Es la luna, ¿no?" (a question tag, never "no")
      // (a bare "El plátano, no" is a no: not_guess)
      "[es] {thing} verdad", "[es] (el | la | un | una) {thing} verdad", "es [el | la | un | una] {thing} no",
      // "No sé… ¿es el sol?": a guess all the same
      "no (se | lo se | estoy seguro | estoy segura) [pero] [creo que] es {thing}",
    ] },
    // "No es el plátano", "No creo que sea la luna": never a guess ("No, creo que es el sol", its comma lost, is one:
    // the indicative says so)
    not_guess: { patterns: ["no es {thing}", "no (creo | pienso) que sea {thing}", "{thing} no", "(el | la | un | una) {thing} no"] },
    // a word that isn't on the list: a wrong guess all the same ("¿Es una bicicleta?")
    guess_unknown: { patterns: ["(es | creo que es | la respuesta es | a lo mejor es | seria | sera) {w:any}"] },
    ask_hint: { patterns: [
      "(me das | me puedes dar | me podrias dar | dame | me da) una pista #h:pista", "(me das | me puedes dar | dame) otra pista", "(una | otra) pista", "(hay | tienes) [una] pista",
      "(me ayudas | ayudame | me puedes ayudar | me podrias ayudar)", "(me das | dame) una ayuda", "(una | otra) ayuda", "necesito (una pista | ayuda)",
    ] },
    repeat_riddle: { patterns: [
      "me la (repites | repite | puedes repetir | podrias repetir | dices otra vez | vuelves a decir) #h:repite",
      "(repite | repiteme | repitemela | repitela) [la adivinanza]", "(otra vez | una vez mas | de nuevo) [la adivinanza]",
      "(puedes | podrias) repetir [la adivinanza]", "(cual | como) era la adivinanza", "la adivinanza otra vez", "(dila | dimela) otra vez",
    ] },
    dont_know: { patterns: ["no se #h:no_se", "no lo se", "ni idea", "no tengo (idea | ni idea)", "no se que es", "no lo adivino", "no (lo | la) puedo adivinar", "no se la respuesta"] },
    give_up: { patterns: ["me rindo #h:rindo", "me doy por (vencido | vencida)", "(dime | dame) la respuesta", "cual es la respuesta", "(que | cual) es [entonces]", "dimelo"] },
    another: { patterns: [
      "(otra | otra adivinanza | una diferente | otra diferente) #h:otra", "(dime | dame | quiero | prefiero) otra [adivinanza]",
      "(esta | esa) no me (gusta | sale)", "no me (gusta | sale) (esta | esa)", "(paso | la siguiente | siguiente)", "cambia [de] adivinanza", "otra mas facil",
    ] },
    hard: { patterns: ["que (dificil | dificiles | complicado | complicada) #h:dificil", "(es | esta) (muy | super | bien)? (dificil | complicado | complicada)", "no es facil", "esta (muy | super)? dificil"] },
    ask_name: { patterns: ["como te llamas #h:q_name", "cual es tu nombre", "quien eres [tu]", "y tu nombre", "tienes nombre"] },
    ask_alux: { patterns: ["que es un (alux | alush | aluxe) #h:q_alux", "que son los (aluxes | alux | aluxe)", "eres un (alux | alush | aluxe)", "que eres [tu]", "(que | quienes) son (los aluxes | ustedes)"] },
    ask_riddle: { patterns: ["que es una adivinanza #h:q_riddle", "que (significa | quiere decir) adivinanza", "que es adivinar", "como se juega"] },
    // "Gracias por el juego": thanks (once she has let the learner cross, the goodbye)
    thanks_game: { patterns: ["[muchas] gracias por (el juego | las adivinanzas | jugar | jugar conmigo | dejarme pasar | el puente)"] },
    ask_pista: { patterns: ["que es una pista", "que (significa | quiere decir) pista"] },
    ask_live: { patterns: ["vives aqui #h:q_live", "(donde | aqui) vives", "esta es tu casa", "(vives | estas) (en la gruta | en el puente | aqui siempre)"] },
    ask_like: { patterns: ["te gustan las adivinanzas #h:q_like", "te gusta (jugar | adivinar | este juego)"] },
  },

  lines: {
    greet: [
      t("¡Alto, | alto! | Este | puente | es | mío.", "Stop, | stop! | This | bridge | is | mine.", "Stop right there! This bridge is mine."),
      t("¡Hola, | hola! | ¿Quién | viene | a | mi | puente?", "Hello, | hello! | Who | comes | to | my | bridge?", "Hello, hello! Who's coming onto my bridge?"),
    ],
    rule: [
      t("Si | quieres | pasar, | adivina. | Dos | adivinanzas, | y | pasas. | ¿Estás | {m:listo|f:lista}?", "If | you-want | to cross, | guess. | Two | riddles, | and | you-cross. | Are you | ready?",
        "If you want to cross, you have to guess. Two riddles, and you can cross. Ready?"),
    ],
    ask_ready: [t("Dos | adivinanzas, | y | pasas. | ¿Jugamos?", "Two | riddles, | and | you-cross. | Shall we play?", "Two riddles, and you can cross. Shall we play?")],
    ask_ready2: [t("¿Y | bien? | ¿Jugamos?", "And | well? | Shall we play?", "Well? Shall we play?")],
    not_ready: [t("Aquí | espero. | ¡No tengo | prisa!", "Here | I-wait. | I don't have | hurry!", "I'll wait right here. I'm in no hurry!")],
    intro_first: [
      t("Escucha | bien:", "Listen | well:", "Listen carefully:"),
      t("Adivina, | adivinador:", "Guess, | guesser:", "Riddle me this:", { flags: { 1: "adivinador: “guesser”. “Adivina, adivinador” is how riddles traditionally begin." } }),
    ],
    intro_next: [
      t("Ahora, | otra:", "Now, | another one:", "Now, another one:"),
      t("Otra | adivinanza:", "Another | riddle:", "Here's another riddle:"),
    ],

    // the riddles
    r_platano: [t("Oro | parece, | plata | no es. | ¿Qué | es?", "Gold | it-looks like, | silver | it isn't. | What | is it?", "It looks like gold, but it isn't silver. What is it?",
      { flags: { 2: "Listen closely: the answer hides in the sound of “plata no es”." } })],
    r_aguacate: [t("Agua | pasa | por | mi | casa, | cate | de | mi | corazón. | ¿Qué | es?", "Water | passes | through | my | house, | (wordplay: a clue, not a word) | of | my | heart. | What | is it?",
      "Water runs through my house, “cate” of my heart. What is it?", { flags: { 5: "cate: no word on its own here. It's a clue: join it to a word you've just heard." } })],
    r_pera: [t("Blanca | por dentro, | verde | por fuera. | Si | quieres | que | te lo | diga, | espera.", "White | inside, | green | outside. | If | you-want | that | it to you | I-tell, | wait.",
      "White inside, green outside. If you want me to tell you, wait.", { flags: { 9: "Listen closely to this last word: say it slowly." } })],
    r_reloj: [t("Tengo | agujas | y | no sé | coser. | Tengo | números | y | no sé | leer.", "I-have | needles | and | I don't know how | to sew. | I-have | numbers | and | I don't know how | to read.",
      "I've got needles, but I can't sew. I've got numbers, but I can't read.", { flags: { 1: "aguja: a sewing needle; the word has a second meaning here." } })],
    r_viento: [t("Vuela | sin | alas, | silba | sin | boca. | ¿Qué | es?", "It-flies | without | wings, | it-whistles | without | mouth. | What | is it?",
      "It flies without wings and whistles without a mouth. What is it?")],
    r_luna: [t("De noche | sale, | redonda | y | blanca. | Nadie | la | toca, | nadie | la | alcanza.", "At night | it-comes out, | round | and | white. | Nobody | it | touches, | nobody | it | reaches.",
      "It comes out at night, round and white. Nobody can touch it, nobody can reach it.", { flags: { 6: "la: “it” (a pronoun here, not the article).", 9: "la: “it” (a pronoun here, not the article)." } })],

    // one clue per riddle
    pista_intro: [
      t("Una | pista:", "A | clue:", "Here's a clue:"),
      t("Te | doy | una | pista:", "(To) you | I-give | a | clue:", "I'll give you a clue:"),
    ],
    hint_again: [t("Ya | te | di | una | pista:", "Already | (to) you | I-gave | a | clue:", "I already gave you a clue:",
      { spain: t("Ya | te | he dado | una | pista:", "Already | (to) you | I-have-given | a | clue:", "I already gave you a clue:") })],
    hint_platano: [t("Es | una | fruta | amarilla.", "It's | a | fruit | yellow.", "It's a yellow fruit.")],
    hint_aguacate: [t("Es | verde, | y | con | él | se hace | el | guacamole.", "It's | green, | and | with | it | is made | the | guacamole.", "It's green, and you make guacamole with it.",
      { flags: { 7: "guacamole: mashed avocado with lime, onion, cilantro and chili (from Nahuatl ahuacamolli, “avocado sauce”)." } })],
    hint_pera: [t("Es | una | fruta. | Escucha | bien | la | última | palabra.", "It's | a | fruit. | Listen | well | the | last | word.", "It's a fruit. Listen carefully to the last word.")],
    hint_reloj: [t("Te | dice | la | hora.", "(To) you | it-tells | the | time.", "It tells you the time.")],
    hint_viento: [t("No lo ves, | pero | mueve | los | árboles.", "You don't see it, | but | it-moves | the | trees.", "You can't see it, but it moves the trees.")],
    hint_luna: [t("Está | en | el | cielo, | pero | no es | el | sol.", "It's | in | the | sky, | but | it isn't | the | sun.", "It's in the sky, but it isn't the sun.")],

    // the answer, when the learner doesn't know it (the pun explained)
    ans_platano: [t("¡Era | el | plátano! | “Plata | no es”... | ¡plátano | es!", "It-was | the | banana! | “Silver | it isn't”... | banana | it-is!",
      "It was the banana! “Plata no es”… say it fast: “plátano es”!", { flags: { 5: "The pun: “plata no es” (it isn't silver) sounds just like “plátano es” (it's a banana)." } })],
    ans_aguacate: [t("¡Era | el | aguacate! | Agua... | cate: | ¡aguacate!", "It-was | the | avocado! | Water... | + cate = avocado: | avocado!",
      "It was the avocado! Agua… cate: aguacate!", { flags: { 5: "The pun: “agua” (water) + “cate” make “aguacate” (avocado)." } })],
    ans_pera: [t("¡Era | la | pera! | “Espera”... | ¡es | pera!", "It-was | the | pear! | “Wait”... | it's | pear!",
      "It was the pear! “Espera”… “es pera”: it's a pear!", { flags: { 3: "The pun: “espera” (wait) sounds just like “es pera” (it's a pear)." } })],
    ans_reloj: [t("¡Era | el | reloj! | Sus | agujas | no cosen, | ¡y | sus | números | no leen!", "It-was | the | clock! | Its | hands | don't sew, | and | its | numbers | don't read!",
      "It was the clock! Its hands don't sew, and its numbers don't read!", { flags: { 4: "las agujas del reloj: a clock's hands (literally “needles”)." } })],
    ans_viento: [t("¡Era | el | viento! | Vuela | y | silba, | pero | nadie | lo | ve.", "It-was | the | wind! | It-flies | and | it-whistles, | but | nobody | it | sees.",
      "It was the wind! It flies and whistles, but nobody sees it.")],
    ans_luna: [t("¡Era | la | luna! | Redonda, | blanca, | y | muy | lejos.", "It-was | the | moon! | Round, | white, | and | very | far away.", "It was the moon! Round, white, and very far away.")],

    right: [
      t("¡Sí! | ¡Muy | bien!", "Yes! | Very | good!", "Yes! Well done!"),
      t("¡Eso | es! | ¡Qué | {m:listo|f:lista}!", "That | is (it)! | How | clever!", "That's it! Aren't you clever!",
        { flags: { 3: "listo / lista: “ready” with estar, “clever” in “¡Qué listo!”." } }),
      t("¡Bravo! | ¡Adivinaste!", "Bravo! | You-guessed (it)!", "Bravo! You got it!",
        { spain: t("¡Bravo! | ¡Lo | has adivinado!", "Bravo! | It | you-have-guessed!", "Bravo! You got it!") }),
    ],
    wrong: [
      t("No, | no... | piensa.", "No, | no... | think.", "No, no… think!"),
      t("Mmm... | no. | ¡Piensa | otra vez!", "Hmm... | no. | Think | again!", "Hmm… no. Think again!"),
      t("¡Ja! | No, | no es | eso.", "Ha! | No, | it isn't | that.", "Ha! No, that's not it."),
    ],
    think: [t("Piensa, | piensa...", "Think, | think...", "Think, think…")],
    hard_offer: [t("Sí, | ¿verdad? | ¿Quieres | una | pista?", "Yes, | right? | Do you want | a | clue?", "It is, isn't it? Do you want a clue?")],
    skip_ok: [t("Bueno, | bueno... | ¡otra!", "Okay, | okay... | another!", "All right, all right… another one!")],
    pass: [t("Pasa, | pasa. | El | puente | es | tuyo.", "Cross, | cross. | The | bridge | is | yours.", "Go on, cross. The bridge is yours.")],
    pass_anyway: [t("Bueno... | pasa. | ¡Pero | vuelve | a | jugar!", "Well... | cross. | But | come back | to | play!", "Oh, all right… go on through. But come back and play again!")],

    // small talk
    name: [t("Me llamo | Nikté. | Nikté | es | “flor” | en | maya.", "My name is | Nikté. | Nikté | is | “flower” | in | Maya.", "My name is Nikté. Nikté means “flower” in Maya.",
      { spell: "Nikté", flags: { 2: "Nikté: Maya for “flower”; the name of the alux of the riddles." } })],
    what_riddle: [t("Una | adivinanza | es | un | juego: | yo | digo | algo, | y | tú | adivinas | qué | es.", "A | riddle | is | a | game: | I | say | something, | and | you | guess | what | it is.",
      "A riddle is a game: I describe something, and you guess what it is.")],
    alux: [t("Soy | un | alux: | un | espíritu | pequeño | de | la | selva. | ¡Y | me encantan | las | travesuras!", "I-am | an | alux: | a | spirit | small | of | the | forest. | And | I love | the | pranks!",
      "I'm an alux: a little spirit of the forest. And I love playing tricks!", { flags: { 2: "alux (plural aluxes): a small spirit of the Maya forest, playful and mischievous." } })],
    live: [t("Sí, | vivo | aquí, | en | la | gruta. | ¡Es | mi | casa | desde hace | mil | años!", "Yes, | I-live | here, | in | the | grotto. | It's | my | home | for | a thousand | years!",
      "Yes, I live here in the grotto. It's been my home for a thousand years!")],
    what_pista: [t("Una | pista | te | ayuda | a | adivinar.", "A | clue | you | it-helps | to | guess.", "A clue helps you guess.")],
    like: [t("¡Me encantan! | Son | mi | juego | favorito.", "I love them! | They're | my | game | favorite.", "I love them! They're my favorite game.")],

    welcome: [t("¡De nada! | Vuelve | cuando | quieras. | ¡Tengo | más | adivinanzas!", "You're welcome! | Come back | when | you-want. | I-have | more | riddles!",
      "You're welcome! Come back anytime. I've got more riddles!")],
    bye: [t("¡Adiós! | ¡Cuidado | con | el | agua!", "Goodbye! | Careful | with | the | water!", "Bye! Watch out for the water!")],
  },

  hints: {
    ready: {
      lt: "Say you're ready",
      items: [
        // (her question is "¿Jugamos?": a yes first)
        { id: "ready_si", s: t("¡Sí, | vamos!", "Yes, | let's go!", "Yes, let's play!") },
        { id: "ready_listo", s: t("Estoy | {m:listo|f:lista}.", "I'm | ready.", "I'm ready.") },
        { id: "ready_vamos", s: t("¡Vamos!", "Let's go!", "Let's do it!") },
        { id: "ready_dime", s: t("Dime.", "Tell me.", "Go ahead."), note: "Dime: “tell me”, to someone you say tú to." },
      ],
    },
    guess: {
      lt: "Guess the answer", slot: "thing", examples: ["sol", "manzana", "gato"],
      items: [
        { id: "g_es", s: t("¿Es | {X.the}?", "Is it | {X.the}?", "Is it {X.the}?") },
        { id: "g_creo", s: t("Creo | que | es | {X.the}.", "I-think | that | it's | {X.the}.", "I think it's {X.the}."), note: "Creo que…: I think (that)…" },
        { id: "g_un", s: t("Es | {X.np}.", "It's | {X.np}.", "It's {X.np}.") },
      ],
    },
    help: {
      lt: "Ask for help",
      items: [
        { id: "pista", s: t("¿Me | das | una | pista?", "(To) me | you-give | a | clue?", "Can you give me a clue?"), note: "una pista: a clue, a hint." },
        { id: "repite", s: t("¿Me la | repites?", "It to me | you-repeat?", "Can you say it again?"), note: "la = la adivinanza (the riddle)." },
        { id: "no_se", s: t("No sé.", "I don't know.", "I don't know.") },
        { id: "dificil", s: t("¡Qué | difícil!", "How | hard!", "That's a hard one!") },
        { id: "otra", s: t("¿Otra, | por favor?", "Another, | please?", "Another one, please?") },
        { id: "rindo", s: t("Me rindo.", "I give up.", "I give up.", { flags: { 0: "rendirse: to give up (me rindo: I give up)." } }) },
      ],
    },
    talk: {
      lt: "Chat with Nikté",
      items: [
        { id: "q_name", s: t("¿Cómo | te llamas?", "How | are you called?", "What's your name?") },
        { id: "q_alux", s: t("¿Qué | es | un | alux?", "What | is | an | alux?", "What's an alux?") },
        { id: "q_live", s: t("¿Vives | aquí?", "Do you live | here?", "Do you live here?") },
        { id: "q_riddle", s: t("¿Qué | es | una | adivinanza?", "What | is | a | riddle?", "What's an adivinanza?") },
        { id: "q_like", s: t("¿Te gustan | las | adivinanzas?", "Do you like | the | riddles?", "Do you like riddles?") },
      ],
    },
  },

  // -------------------------------------------------------------------------

  mission: [
    { step: "ready", lt: "Say you are ready" },
    { lt: "Guess the first riddle", done: (c) => c.s.right >= 1 || !!c.s.passed },
    { lt: "Guess the second riddle", done: (c) => c.s.right >= TO_PASS || !!c.s.passed },
    // shown while the riddles last (ticked once asked for)
    { lt: "Ask for a clue", optional: true, when: (c) => !!c.s.ready && !c.s.passed, done: (c) => !!c.s.askedHint },
    // shown once she lets you cross
    { lt: "Say thank you", optional: true, when: (c) => !!c.s.passed, done: (c) => !!c.s.thanked },
  ],
  steps: [
    { id: "ready", done: (c) => !!c.s.ready,
      // the rule, then (after a side question) a short reminder, never the same one twice in a row
      ask: (c) => { const n = c.s.readyAsks ?? 0; c.s.readyAsks = n + 1; c.say(n === 0 ? "rule" : n % 2 ? "ask_ready" : "ask_ready2"); },
      expects: ["ready", "not_ready", "ask_name", "ask_riddle", "ask_alux", "ask_live", "ask_like", "ask_pista"],
      suggest: [{ lt: "Say you're ready", hint: "ready" }, { lt: "Chat with Nikté", hint: "talk" }],
      yes: (c) => { c.s.ready = true; },
      no: (c) => notReady(c) },
    { id: "riddle", when: (c) => !!c.s.ready, done: (c) => !!c.s.passed,
      ask: (c) => askRiddle(c),
      expects: ["guess_ctx", "guess_unknown", "not_guess", "ask_hint", "repeat_riddle", "dont_know", "give_up", "another", "hard", "ask_pista"],
      suggest: (c): Suggestion[] => [
        { lt: "Guess the answer", hint: "guess", options: RIDDLES.find((r) => r.id === c.s.cur)?.choices ?? "thing" },
        { lt: "Ask for help", hint: "help" },
        { lt: "Chat with Nikté", hint: "talk" },
      ],
      help: (c) => dontKnow(c) },
  ],

  init: (c) => {
    // a new order on each visit; the riddles asked last time go to the end
    const seen: string[] = Array.isArray(c.memory.seen) ? c.memory.seen : [];
    const pool = [...RIDDLE_IDS];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(c.rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    c.s.pool = [...pool.filter((id) => !seen.includes(id)), ...pool.filter((id) => seen.includes(id))];
    c.s.asked = [];
    c.s.cur = null;
    c.s.right = 0;
    c.s.missed = 0;
  },

  start: (c) => {
    c.say("greet");
  },

  handlers: {
    ready(c) { if (!c.s.ready) c.s.ready = true; },
    not_ready(c) {
      if (c.s.cur) { c.say("think"); c.hold(); return; }
      notReady(c);
    },
    guess_ctx(c, slots) {
      if (!c.s.cur || c.s.passed) return;
      if (slots.thing === c.s.cur) rightAnswer(c);
      else wrongAnswer(c);
    },
    guess_unknown(c) { if (c.s.cur && !c.s.passed) wrongAnswer(c); },
    not_guess(c) { if (c.s.cur) { c.say("think"); c.hold(); } },
    ask_hint(c) {
      if (!c.s.cur) { c.s.ready = true; return; } // the riddle first
      giveHint(c, true);
    },
    repeat_riddle(c, slots) { repeatRiddle(c, slots); },
    g_repeat(c, slots) { repeatRiddle(c, slots); },
    dont_know(c) { dontKnow(c); },
    g_dontknow(c) { dontKnow(c); },
    give_up(c) {
      if (!c.s.cur) { c.s.ready = true; return; }
      reveal(c);
    },
    another(c) {
      if (!c.s.cur) { c.s.ready = true; return; } // between riddles: the next one comes anyway
      c.s.missed++;
      c.s.cur = null;
      c.s.skipIntro = true;
      c.say("skip_ok");
      if (c.s.missed >= MAX_MISSED) passAnyway(c);
    },
    hard(c) {
      if (c.s.cur && !c.s.hintGiven) {
        c.say("hard_offer");
        c.expect({ id: "hint_offer", optional: true, expects: ["ask_hint", "guess_ctx", "dont_know"], hints: ["help"],
          suggest: [{ lt: "Say yes or no", hint: "g_yesno" }, { lt: "Guess the answer", hint: "guess", options: RIDDLES.find((r) => r.id === c.s.cur)?.choices ?? "thing" }],
          yes: (cc) => giveHint(cc, true),
          no: (cc) => { cc.say("think"); cc.hold(); } });
        c.hold();
        return;
      }
      c.say("think"); c.hold();
    },
    ask_name(c) { smallTalk(c, "name"); },
    ask_alux(c) { smallTalk(c, "alux"); },
    ask_riddle(c) { smallTalk(c, "what_riddle"); },
    ask_live(c) { smallTalk(c, "live"); },
    ask_like(c) { smallTalk(c, "like"); },
    ask_pista(c) { smallTalk(c, "what_pista"); },
    thanks_game(c, slots) {
      if (c.s.passed) { thank(c); return; }
      GLOBAL_HANDLERS.g_thanks(c as ConvCtx, slots);
    },
    g_thanks(c, slots) {
      if (c.s.passed) { thank(c); return; }
      GLOBAL_HANDLERS.g_thanks(c as ConvCtx, slots);
    },
    g_bye(c, slots) {
      if (c.s.passed) { bye(c); return; }
      GLOBAL_HANDLERS.g_bye(c as ConvCtx, slots);
    },
  },

  // she has let the learner cross: thanks or a goodbye ends it
  finish: (c) => {
    c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: { g_thanks: (cc) => { thank(cc); return true; }, thanks_game: (cc) => { thank(cc); return true; }, g_bye: (cc) => { bye(cc); return true; } },
      yes: (cc) => { done(cc); cc.end(); }, no: (cc) => { done(cc); cc.end(); } });
  },

  merges: {
    "por dentro": { reason: "lexical_expression", split: "por → through/by + dentro → inside; = (on the) inside.", minimal: "Two words." },
    "por fuera": { reason: "lexical_expression", split: "por → through/by + fuera → outside; = (on the) outside.", minimal: "Two words." },
    "de noche": { reason: "lexical_expression", split: "de → of + noche → night; = at night.", minimal: "Two words." },
    "me rindo": { reason: "lexical_expression", split: "me → myself + rindo → I-surrender; = I give up.", minimal: "Two words." },
    "desde hace": { reason: "lexical_expression", split: "desde → since + hace → it makes; = for (a length of time, until now).", minimal: "Two words." },
  },

  tests: [
    // ready
    { say: "Estoy listo", intent: "ready", step: "ready" },
    { say: "Estoy lista", intent: "ready", step: "ready" },
    { say: "¡Vamos!", intent: "ready", step: "ready" },
    { say: "Dime", intent: "ready", step: "ready" },
    { say: "Sí, quiero jugar", intent: "ready", step: "ready" },
    { say: "Venga, vamos", intent: "ready", step: "ready" },
    { say: "Todavía no", intent: "not_ready", step: "ready", not: ["ready"] },
    { say: "No estoy listo", intent: "not_ready", step: "ready", not: ["ready"] },
    // guesses
    { say: "¿Es el plátano?", intent: "guess_ctx", step: "riddle", slots: { thing: "platano" } },
    { say: "Es un plátano", intent: "guess_ctx", step: "riddle", slots: { thing: "platano" } },
    { say: "Creo que es el aguacate", intent: "guess_ctx", step: "riddle", slots: { thing: "aguacate" } },
    { say: "La pera", intent: "guess_ctx", step: "riddle", slots: { thing: "pera" } },
    { say: "el reloj", intent: "guess_ctx", step: "riddle", slots: { thing: "reloj" } },
    { say: "¿Será el viento?", intent: "guess_ctx", step: "riddle", slots: { thing: "viento" } },
    { say: "Ya sé, es la luna", intent: "guess_ctx", step: "riddle", slots: { thing: "luna" } },
    { say: "Una banana", intent: "guess_ctx", step: "riddle", slots: { thing: "platano" } },
    { say: "¿Es una palta?", intent: "guess_ctx", step: "riddle", slots: { thing: "aguacate" } },
    { say: "es el aire", intent: "guess_ctx", step: "riddle", slots: { thing: "viento" } },
    { say: "Pienso que es la plata", intent: "guess_ctx", step: "riddle", slots: { thing: "plata" } },
    { say: "¿Es el agua?", intent: "guess_ctx", step: "riddle", slots: { thing: "agua" } },
    { say: "La respuesta es el sol", intent: "guess_ctx", step: "riddle", slots: { thing: "sol" } },
    { say: "¿Es una bicicleta?", intent: "guess_unknown", step: "riddle" },
    { say: "Es la luna, ¿no?", intent: "guess_ctx", step: "riddle", slots: { thing: "luna" }, not: ["another", "not_guess"] },
    { say: "¿Me das otra pista?", intent: "ask_hint", step: "riddle" },
    { say: "¿Qué es una pista?", intent: "ask_pista", step: "riddle", not: ["give_up", "ask_hint"] },
    { say: "El plátano no", intent: "not_guess", step: "riddle", not: ["guess_ctx"] },
    { say: "No sé, ¿es el sol?", intent: "guess_ctx", step: "riddle", slots: { thing: "sol" }, not: ["not_guess"] },
    { say: "Gracias por las adivinanzas", intent: "thanks_game" },
    // never a guess
    { say: "No es el plátano", intent: "not_guess", step: "riddle", not: ["guess_ctx"] },
    { say: "No creo que sea la luna", intent: "not_guess", step: "riddle", not: ["guess_ctx"] },
    { say: "plátano", intent: "none" },
    // help
    { say: "¿Me das una pista?", intent: "ask_hint", step: "riddle" },
    { say: "Dame una pista, por favor", intent: "ask_hint", step: "riddle" },
    { say: "¿Me ayudas?", intent: "ask_hint", step: "riddle" },
    { say: "¿Me la repites?", intent: "repeat_riddle", step: "riddle" },
    { say: "Otra vez, por favor", intent: "repeat_riddle", step: "riddle", not: ["another"] },
    { say: "¿Me la puedes repetir?", intent: "repeat_riddle", step: "riddle" },
    { say: "No sé", intent: "dont_know", step: "riddle", not: ["guess_ctx"] },
    { say: "Ni idea", intent: "dont_know", step: "riddle" },
    { say: "No lo sé", intent: "dont_know", step: "riddle" },
    { say: "Me rindo", intent: "give_up", step: "riddle" },
    { say: "Dime la respuesta", intent: "give_up", step: "riddle", not: ["ready"] },
    { say: "¿Otra, por favor?", intent: "another", step: "riddle", not: ["repeat_riddle"] },
    { say: "Dime otra", intent: "another", step: "riddle", not: ["ready"] },
    { say: "¡Qué difícil!", intent: "hard", step: "riddle" },
    { say: "Está muy difícil", intent: "hard", step: "riddle", not: ["guess_unknown"] },
    // small talk
    { say: "¿Cómo te llamas?", intent: "ask_name" },
    { say: "¿Quién eres?", intent: "ask_name" },
    { say: "¿Qué es un alux?", intent: "ask_alux", not: ["g_meaning"] },
    { say: "¿Eres un alux?", intent: "ask_alux" },
    { say: "¿Qué es una adivinanza?", intent: "ask_riddle", not: ["g_meaning"] },
    { say: "¿Vives aquí?", intent: "ask_live" },
    { say: "¿Te gustan las adivinanzas?", intent: "ask_like" },
    // Spain's forms: vale, venga, vosotros
    { say: "Vale, estoy lista", intent: "ready", step: "ready" },
    { say: "¿Los aluxes vivís aquí?", intent: "none" },
    { say: "¿Qué sois los aluxes?", intent: "ask_alux" },
    // not understood
    { say: "mi hermano trabaja en un banco", intent: "none" },
    { say: "pasta de dientes", intent: "none", step: "ready" },
  ],

  sims: [
    { name: "two riddles guessed, thanks", turns: ["¡Hola!", "¿Cómo te llamas?", "Estoy listo", "¿Es el plátano?", "Creo que es el aguacate", "¡Muchas gracias, Nikte!"],
      expect: { complete: true, state: { passed: true, right: 2, thanked: true } }, auto: NIKTE_AUTO,
      setup: (s) => { s.pool = ["platano", "aguacate", "pera", "reloj", "viento", "luna"]; } },
    { name: "help: again, a clue offered, a wrong guess, a clue asked", turns: ["Vamos", "¿Me la repites?", "¡Qué difícil!", "Sí, por favor", "¿Es la manzana?", "Es la pera", "¿Me das una pista?", "El reloj", "Gracias"],
      expect: { complete: true, state: { passed: true, right: 2, askedHint: true } }, auto: NIKTE_AUTO,
      setup: (s) => { s.pool = ["pera", "reloj", "luna", "viento", "platano", "aguacate"]; } },
    { name: "never guesses: clues, answers, and she lets you pass anyway", turns: ["Dime", "No sé", "No sé", "No sé", "No sé", "Me rindo", "Gracias, adiós"],
      expect: { complete: true, state: { passed: true, right: 0, missed: 3 } }, auto: NIKTE_AUTO,
      setup: (s) => { s.pool = ["luna", "viento", "aguacate", "pera", "reloj", "platano"]; } },
    { name: "slips and short answers; another riddle", turns: ["hola", "que es una adivinanza", "si", "es un libro", "un reloj", "otra por favor", "la luna", "gracias adios"],
      expect: { complete: true, state: { passed: true, right: 2, missed: 1 } }, auto: NIKTE_AUTO,
      setup: (s) => { s.pool = ["reloj", "platano", "luna", "viento", "pera", "aguacate"]; } },
    { name: "a learner from Spain", turns: ["Vale", "¿Es la plata?", "Es un plátano", "No lo sé", "Es la pera", "Muchas gracias, adiós"],
      expect: { complete: true, state: { passed: true, right: 2 } }, auto: NIKTE_AUTO,
      setup: (s) => { s.pool = ["platano", "pera", "luna", "viento", "reloj", "aguacate"]; } },
    { name: "small talk first, then one wrong guess and one right one", turns: ["¿Qué es un alux?", "¿Vives aquí?", "¿Te gustan las adivinanzas?", "Sí, vamos", "banana", "No es el agua", "aguacate", "¡Gracias!"],
      expect: { complete: true, state: { passed: true, right: 2 } }, auto: NIKTE_AUTO,
      setup: (s) => { s.pool = ["platano", "aguacate", "pera", "reloj", "viento", "luna"]; } },
  ],
};

// ---------------------------------------------------------------------------

/** The next riddle from the pool (with its "Escucha bien:" / "Otra adivinanza:"), or the open one again. */
function askRiddle(c: Ctx) {
  if (c.s.cur) { c.say(`r_${c.s.cur}`); return; }
  const id = (c.s.pool as string[]).find((r) => !(c.s.asked as string[]).includes(r));
  if (!id) { passAnyway(c); return; }
  const first = !(c.s.asked as string[]).length;
  c.s.asked.push(id);
  c.s.cur = id;
  c.s.hintGiven = false;
  c.s.wrong = 0;
  if (first) c.say("intro_first");
  else if (!c.s.skipIntro) c.say("intro_next");
  c.s.skipIntro = false;
  c.say(`r_${id}`);
}

function rightAnswer(c: Ctx) {
  c.s.right++;
  c.s.cur = null;
  c.say("right");
  if (c.s.right >= TO_PASS) letPass(c, "pass");
  // else the step asks the next riddle
}

/** A wrong guess: "No, no… piensa."; the second one brings the clue, the fourth the answer. */
function wrongAnswer(c: Ctx) {
  c.s.wrong++;
  c.say("wrong");
  if (c.s.wrong >= 4) { reveal(c); return; }
  if (c.s.wrong === 2 && !c.s.hintGiven) { giveHint(c, false); return; }
  c.hold();
}

/** The riddle's clue ("Una pista: es una fruta amarilla."); asked for again: "Ya te di una pista: …". */
function giveHint(c: Ctx, asked: boolean) {
  if (!c.s.cur) return;
  if (asked) c.s.askedHint = true;
  c.say(c.s.hintGiven ? "hint_again" : "pista_intro");
  c.s.hintGiven = true;
  c.say(`hint_${c.s.cur}`);
  c.hold();
}

/** "No sé": the clue first, then the answer (and the next riddle). */
function dontKnow(c: Ctx) {
  if (!c.s.cur) { notReady(c); return; }
  if (!c.s.hintGiven) giveHint(c, false);
  else reveal(c);
}

/** The answer, with its pun; then the next riddle, or (after three not guessed) the bridge anyway. */
function reveal(c: Ctx) {
  c.say(`ans_${c.s.cur}`);
  c.s.cur = null;
  c.s.missed++;
  if (c.s.missed >= MAX_MISSED && c.s.right < TO_PASS) passAnyway(c);
}

function passAnyway(c: Ctx) {
  c.twist("pass_anyway");
  letPass(c, "pass_anyway");
}

function letPass(c: Ctx, line: string) {
  if (c.s.passed) return;
  c.s.passed = true;
  c.s.cur = null;
  c.say(line);
  c.event("alux-pass", { gate: "nikte" });
  c.remember({ seen: [...(c.s.asked as string[])] });
}

function repeatRiddle(c: Ctx, slots: any) {
  if (c.s.cur) { c.say(`r_${c.s.cur}`); c.hold(); return; }
  GLOBAL_HANDLERS.g_repeat(c as ConvCtx, slots);
}

/** "Todavía no": she waits (the second time, the town's "Tómate tu tiempo"). */
function notReady(c: Ctx) {
  c.say(c.s.waited ? "g_take_time" : "not_ready");
  c.s.waited = true;
  c.hold();
}

/** A side question: answered; a riddle still open stays open (it isn't said again). */
function smallTalk(c: Ctx, line: string) {
  c.say(line);
  if (c.s.cur) c.hold();
}

function done(c: Ctx) {
  if (c.s.done) return;
  c.s.done = true;
  c.complete();
}

function thank(c: Ctx) {
  c.s.thanked = true;
  if (!c.s.closed) { c.s.closed = true; c.say("welcome"); }
  done(c);
  c.end();
}

function bye(c: Ctx) {
  if (/\bgracias\b/.test(fold(c.heard))) c.s.thanked = true;
  if (!c.s.closed) { c.s.closed = true; c.say("bye"); }
  done(c);
  c.end();
}

export default aluxNikte;
