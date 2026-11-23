// Lotería lines (batch 4, 23 Nov 2026). Learner words by Claude. Spread into x10-loteria's lines, as the pool's lines
// are spread into x09-alberca. Speakers: Don Beto (the caller, lt_b_*, and every card: lt_c_*, lt_v_*), Doña Toña
// (the neighbour, lt_t_*), the learner (lt_a_loteria, and the card names when reading a winning board back).
// Card names and verses are Mexican and the same in every variety; the verses are traditional, except 26 and 38 (ours).
import { t } from "@/content/dsl";
import type { MergeRecord } from "@/content/merges";
import type { SentSrc } from "@/content/types";

const LEX = (split: string, minimal = "All words form the expression."): MergeRecord =>
  ({ reason: "lexical_expression", split, minimal, code: "S-LEX" });

export const LOTERIA_MERGES: Record<string, MergeRecord> = {
  "don beto": LEX("A name with its title: Don Beto.", "Title and name."),
  "doña toña": LEX("A name with its title: Doña Toña.", "Title and name."),
  "pa'l": LEX("Spoken contraction of para el: to the.", "One spoken word."),
};

const F_DIM = "-ito makes a word small and fond: diablo → diablito.";
const F_DIM_CAP = "-ito makes a word small and fond: gorro → gorrito.";
const F_DIM_JUG = "-ito makes a word small and fond: cántaro → cantarito.";

const card = (es: string, gloss: string, nat: string, flags?: Record<number, string>): SentSrc[] =>
  [t(es, gloss, nat, flags ? { flags } : {})];

/** lt_c_<id>: the called name of each card. */
export const LOTERIA_CARD_LINES: Record<string, SentSrc[]> = {
  lt_c_gallo: card("El | gallo", "The | rooster", "The rooster"),
  lt_c_diablito: card("El | diablito", "The | little-devil", "The little devil", { 1: F_DIM }),
  lt_c_dama: card("La | dama", "The | lady", "The lady"),
  lt_c_catrin: card("El | catrín", "The | dandy", "The dandy", { 1: "catrín: a dapper gentleman in a top hat (Mexico)." }),
  lt_c_paraguas: card("El | paraguas", "The | umbrella", "The umbrella"),
  lt_c_sirena: card("La | sirena", "The | mermaid", "The mermaid"),
  lt_c_escalera: card("La | escalera", "The | ladder", "The ladder", { 1: "escalera: a ladder, and also stairs." }),
  lt_c_botella: card("La | botella", "The | bottle", "The bottle"),
  lt_c_barril: card("El | barril", "The | barrel", "The barrel"),
  lt_c_arbol: card("El | árbol", "The | tree", "The tree"),
  lt_c_melon: card("El | melón", "The | melon", "The melon"),
  lt_c_valiente: card("El | valiente", "The | brave-one", "The brave man"),
  lt_c_gorrito: card("El | gorrito", "The | little-cap", "The little cap", { 1: F_DIM_CAP }),
  lt_c_muerte: card("La | muerte", "The | death", "Death"),
  lt_c_pera: card("La | pera", "The | pear", "The pear"),
  lt_c_bandera: card("La | bandera", "The | flag", "The flag"),
  lt_c_bandolon: card("El | bandolón", "The | big-mandolin", "The big mandolin", { 1: "bandolón: a big Mexican mandolin." }),
  lt_c_violoncello: card("El | violoncello", "The | cello", "The cello"),
  lt_c_garza: card("La | garza", "The | heron", "The heron"),
  lt_c_pajaro: card("El | pájaro", "The | bird", "The bird"),
  lt_c_mano: card("La | mano", "The | hand", "The hand", { 1: "mano: feminine, though it ends in -o." }),
  lt_c_bota: card("La | bota", "The | boot", "The boot"),
  lt_c_luna: card("La | luna", "The | moon", "The moon"),
  lt_c_cotorro: card("El | cotorro", "The | parrot", "The parrot", { 1: "cotorro: a parrot (Mexico; also loro)." }),
  lt_c_borracho: card("El | borracho", "The | drunk", "The drunk"),
  lt_c_colibri: card("El | colibrí", "The | hummingbird", "The hummingbird"),
  lt_c_corazon: card("El | corazón", "The | heart", "The heart"),
  lt_c_sandia: card("La | sandía", "The | watermelon", "The watermelon"),
  lt_c_tambor: card("El | tambor", "The | drum", "The drum"),
  lt_c_camaron: card("El | camarón", "The | shrimp", "The shrimp"),
  lt_c_jaras: card("Las | jaras", "The | arrows", "The arrows", { 1: "jaras: arrows (an old word)." }),
  lt_c_musico: card("El | músico", "The | musician", "The musician"),
  lt_c_arana: card("La | araña", "The | spider", "The spider"),
  lt_c_soldado: card("El | soldado", "The | soldier", "The soldier"),
  lt_c_estrella: card("La | estrella", "The | star", "The star"),
  lt_c_cazo: card("El | cazo", "The | saucepan", "The saucepan"),
  lt_c_mundo: card("El | mundo", "The | world", "The world"),
  lt_c_elote: card("El | elote", "The | corn-on-the-cob", "The corn on the cob", { 1: "elote: corn on the cob (Mexico), sold hot on the street." }),
  lt_c_nopal: card("El | nopal", "The | cactus", "The cactus", { 1: "nopal: the prickly pear cactus; its pads are eaten too." }),
  lt_c_alacran: card("El | alacrán", "The | scorpion", "The scorpion"),
  lt_c_rosa: card("La | rosa", "The | rose", "The rose"),
  lt_c_calavera: card("La | calavera", "The | skull", "The skull"),
  lt_c_campana: card("La | campana", "The | bell", "The bell"),
  lt_c_cantarito: card("El | cantarito", "The | little-jug", "The little jug", { 1: F_DIM_JUG }),
  lt_c_venado: card("El | venado", "The | deer", "The deer"),
  lt_c_sol: card("El | sol", "The | sun", "The sun"),
  lt_c_corona: card("La | corona", "The | crown", "The crown"),
  lt_c_chalupa: card("La | chalupa", "The | canoe", "The canoe", { 1: "chalupa: a small flat boat; also a snack (Mexico)." }),
  lt_c_pino: card("El | pino", "The | pine", "The pine tree"),
  lt_c_pescado: card("El | pescado", "The | fish", "The fish", { 1: "pescado: a fish that's caught or cooked; a live one is pez." }),
  lt_c_palma: card("La | palma", "The | palm-tree", "The palm tree"),
  lt_c_maceta: card("La | maceta", "The | flowerpot", "The flowerpot"),
  lt_c_arpa: card("El | arpa", "The | harp", "The harp", { 0: "el arpa: arpa is feminine, but takes el before its stressed a-." }),
  lt_c_rana: card("La | rana", "The | frog", "The frog"),
};

/** lt_v_<id>: Don Beto's verse before the name (traditional; 26 and 38 are ours). */
export const LOTERIA_VERSE_LINES: Record<string, SentSrc[]> = {
  lt_v_gallo: [t("El | que | le | cantó | a | San | Pedro.", "The-one | that | for-him | sang | to | Saint | Peter.", "The one that crowed for Saint Peter.",
    { flags: { 5: "San Pedro: Saint Peter; in the Bible story the rooster crows for him." } })],
  lt_v_diablito: [t("Pórtate | bien, | cuatito, | si | no | te | lleva | el | coloradito.", "Behave | well, | buddy, | if | not | you | he-takes | the | little-red-one.", "Behave, buddy, or the little red one will take you.",
    { flags: { 2: "cuatito: “buddy” (Mexico, from cuate)." } })],
  lt_v_paraguas: [t("Para | el | sol | y | para | el | agua.", "For | the | sun | and | for | the | water.", "For the sun and for the rain.",
    { flags: { 6: "A pun: para + aguas, “for waters”, makes paraguas." } })],
  lt_v_sirena: [t("Con | los | cantos | de | sirena, | no | te | vayas | a | marear.", "With | the | songs | of | mermaid, | not | yourself | you-go | to | get-dizzy.", "Don't let the mermaid's songs make you dizzy.")],
  lt_v_escalera: [t("Súbeme | paso | a | pasito, | no | quieras | pegar | brinquitos.", "Take-me-up | step | by | little-step, | not | you-want | to-do | little-hops.", "Take me up step by little step, no hopping.",
    { flags: { 7: "pegar brinquitos: to hop about (Mexico, spoken)." } })],
  lt_v_gorrito: [t("Ponle | su | gorrito | al | nene, | no | se | nos | vaya | a | resfriar.", "Put-on-him | his | little-cap | to-the | baby, | not | himself | on-us | he-goes | to | catch-cold.", "Put the baby's little cap on, so he doesn't catch a cold.")],
  lt_v_muerte: [t("La | muerte, | tilica | y | flaca.", "The | death, | skinny | and | thin.", "Death, all skin and bones.",
    { flags: { 2: "tilica: very thin (Mexico, spoken)." } })],
  lt_v_pera: [t("El | que | espera | desespera.", "The-one | who | waits | despairs.", "He who waits despairs.",
    { flags: { 2: "A pun: es-pera hides the pear, pera." } })],
  lt_v_bandera: [t("Verde, | blanco | y | colorado, | la | bandera | del | soldado.", "Green, | white | and | red, | the | flag | of-the | soldier.", "Green, white and red, the soldier's flag.",
    { flags: { 3: "colorado: red (an older word; today rojo)." } })],
  lt_v_bandolon: [t("Tocando | su | bandolón, | está | el | mariachi | Simón.", "Playing | his | big-mandolin, | is | the | mariachi | Simón.", "Simón the mariachi is playing his big mandolin.")],
  lt_v_bota: [t("Una | bota | igual | que | la | otra.", "One | boot | same | as | the | other.", "One boot just like the other.")],
  lt_v_luna: [t("El | farol | de | los | enamorados.", "The | lantern | of | the | lovers.", "The lovers' lantern.")],
  lt_v_cotorro: [t("Cotorro, | cotorro, | saca | la | pata | y | empiézame | a | platicar.", "Parrot, | parrot, | stick-out | the | foot | and | start-for-me | to | chat.", "Parrot, parrot, stick out your foot and start chatting with me.",
    { flags: { 8: "platicar: to chat (Mexico; also charlar)." } })],
  lt_v_colibri: [t("El | que | le | da | nombre | al | puerto.", "The-one | that | to-it | gives | name | to-the | port.", "The one that gives the port its name.")],
  lt_v_corazon: [t("No | me | extrañes, | corazón, | que | regreso | en | el | camión.", "Not | me | you-miss, | heart, | for | I-come-back | on | the | bus.", "Don't miss me, sweetheart, I'll be back on the bus.",
    { flags: { 3: "corazón: “heart”, and a sweet name for someone you love.", 8: "camión: a bus (Mexico)." } })],
  lt_v_camaron: [t("Camarón | que | se | duerme, | se | lo | lleva | la | corriente.", "Shrimp | that | itself | sleeps, | itself | it | carries | the | current.", "A shrimp that falls asleep gets carried off by the current.",
    { flags: { 0: "A saying: doze off and you miss out." } })],
  lt_v_soldado: [t("Uno, | dos | y | tres, | el | soldado | pa'l | cuartel.", "One, | two | and | three, | the | soldier | to-the | barracks.", "One, two and three, the soldier's off to the barracks.",
    { flags: { 6: "pa'l: spoken for para el." } })],
  lt_v_estrella: [t("La | guía | de | los | marineros.", "The | guide | of | the | sailors.", "The sailors' guide.")],
  lt_v_elote: [t("Con | limón, | con | sal | y | con | chile.", "With | lime, | with | salt | and | with | chili.", "With lime, with salt and with chili.",
    { flags: { 1: "limón: in Mexico, the small green lime." } })],
  lt_v_rosa: [t("Rosita, | Rosaura, | ven | que | te | quiero | ahora.", "Rosita, | Rosaura, | come | for | you | I-love | now.", "Rosita, Rosaura, come here, I love you now.")],
  lt_v_calavera: [t("Al | pasar | por | el | panteón, | me | encontré | un | calaverón.", "On-the | passing | by | the | cemetery, | myself | I-found | a | big-skull.", "Passing by the cemetery, I came across a big skull.",
    { flags: { 4: "panteón: a cemetery (Mexico).", 8: "-ón makes a word big: calavera → calaverón." } })],
  lt_v_venado: [t("Saltando | va | buscando, | pero | no | ve | nada | el | venado.", "Leaping | it-goes | looking, | but | not | it-sees | nothing | the | deer.", "It goes leaping and looking, but the deer sees nothing.",
    { flags: { 6: "A pun: ve nada, “sees nothing”, sounds like venado." } })],
  lt_v_sol: [t("La | cobija | de | los | pobres.", "The | blanket | of | the | poor.", "The blanket of the poor.",
    { flags: { 1: "cobija: a blanket (Mexico; also manta)." } })],
  lt_v_corona: [t("El | sombrero | de | los | reyes.", "The | hat | of | the | kings.", "The kings' hat.")],
  lt_v_chalupa: [t("Rema | que | rema, | Lupita, | sentada | en | su | chalupita.", "She-rows | and | rows, | Lupita, | sitting | in | her | little-canoe.", "Lupita rows and rows, sitting in her little canoe.")],
  lt_v_pino: [t("Fresco | y | oloroso, | en | todo | tiempo | hermoso.", "Fresh | and | fragrant, | in | every | season | beautiful.", "Fresh and fragrant, beautiful in every season.")],
  lt_v_palma: [t("Palmero, | sube | a | la | palma | y | bájame | un | coco | real.", "Palm-climber, | go-up | to | the | palm | and | bring-me-down | a | coconut | royal.", "Palm climber, climb the palm and bring me down a royal coconut.")],
  lt_v_rana: [t("Al | ver | a | la | verde | rana, | qué | susto | se | dio | mi | hermana.", "On-the | seeing | — | the | green | frog, | what | fright | herself | she-gave | my | sister.", "When my sister saw the green frog, what a fright she got!")],
};

export const LOTERIA_LINES: Record<string, SentSrc[]> = {
  ...LOTERIA_CARD_LINES,
  ...LOTERIA_VERSE_LINES,
  // Don Beto, the caller
  lt_b_open: [t("¡Buenas noches | a | todos! | ¡Vamos | a | jugar | lotería!", "Good evening | to | everyone! | Let's-go | to | play | lotería!", "Good evening, everyone! Let's play lotería!",
    { flags: { 6: "jugar lotería: in Mexico often said without a la (jugar a la lotería)." } })],
  lt_b_linea: [t("Esta | ronda | es | de | línea.", "This | round | is | of | line.", "This round is for a line.")],
  lt_b_esquinas: [t("Esta | ronda | es | de | cuatro | esquinas.", "This | round | is | of | four | corners.", "This round is for the four corners.")],
  lt_b_llena: [t("Esta | ronda | es | de | tabla | llena.", "This | round | is | of | board | full.", "This round is for a full board.")],
  lt_b_go: [t("¡Se | va | y | se | corre!", "Itself | it-goes | and | itself | it-runs!", "And off we go!",
    { flags: { 0: "¡Se va y se corre!: the caller's traditional start, “off we go!”." } })],
  lt_b_next: [t("¡La | que | sigue!", "The-one | that | follows!", "Next one!")],
  lt_b_ahi_va: [t("¡Ahí | va!", "There | it-goes!", "Here it comes!")],
  lt_b_check: [t("A ver, | ¿cuáles | tiene?", "Let's see, | which-ones | you-have?", "Let's see, which ones have you got?")],
  lt_b_buena: [t("¡Es | buena! | ¡Felicidades!", "It-is | good! | Congratulations!", "It counts! Congratulations!",
    { flags: { 1: "¡Es buena!: the board wins; people also shout ¡Buena!" } })],
  lt_b_notyet: [t("A ver… | No, | todavía | no. | ¡Siga | jugando!", "Let's see… | No, | still | not. | Keep | playing!", "Let's see… No, not yet. Keep playing!")],
  lt_b_tona: [t("¡Lotería | para | Doña Toña!", "Lotería | for | Doña Toña!", "Lotería for Doña Toña!")],
  lt_b_end: [t("¡Gracias | por | jugar! | ¿Otra | tablita?", "Thanks | for | playing! | Another | little-board?", "Thanks for playing! Another board?")],
  // Doña Toña, the neighbour, during the game
  lt_t_suerte: [t("¡Suerte!", "Luck!", "Good luck!")],
  lt_t_tiene: [t("¡Esa | la | tiene | usted! | Mire.", "That-one | it | have | you! | Look.", "You've got that one! Look.")],
  lt_t_casi: [t("¡Ya | casi, | ya | casi!", "Already | almost, | already | almost!", "Almost there, almost!")],
  lt_t_falta: [t("¡Ay, | me | falta | una!", "Oh, | to-me | it-lacks | one!", "Oh, I just need one more!")],
  lt_t_nada: [t("Yo | todavía | no | tengo | nada.", "I | still | not | have | nothing.", "I don't have anything yet.",
    { flags: { 2: "no … nada: Spanish doubles the negative; English says not … anything." } })],
  lt_t_bonita: [t("¡Qué | bonita | carta!", "What | pretty | card!", "What a pretty card!")],
  lt_t_esquites: [t("¿Ya | probó | los | esquites? | ¡Están | riquísimos!", "Already | you-tried | the | corn-cups? | They-are | super-tasty!", "Have you tried the corn cups yet? They're delicious!",
    { flags: { 3: "esquites: corn kernels in a cup with lime, chili and mayonnaise, a street snack (Mexico).", 5: "-ísimo means “very”: rico → riquísimo." } })],
  lt_t_grite: [t("¡Ándele, | grite | «¡Lotería!»!", "Come-on, | shout | “Lotería!”!", "Go on, shout “Lotería!”!",
    { flags: { 0: "ándele: “go on, come on” (Mexico), to usted." } })],
  lt_t_felicidades: [t("¡Felicidades! | ¡Qué | suerte | tiene!", "Congratulations! | What | luck | you-have!", "Congratulations! You're so lucky!")],
  lt_t_gane: [t("¡Lotería! | ¡Gané!", "Lotería! | I-won!", "Lotería! I won!")],
  lt_t_otra: [t("¡Ay, | qué | pena! | La | próxima | es | suya.", "Oh, | what | pity! | The | next | is | yours.", "Oh, what a shame! The next one's yours.")],
  lt_t_noyet: [t("Esa | todavía | no | sale.", "That-one | still | not | comes-out.", "That one hasn't come up yet.")],
  lt_t_bye: [t("¡Qué | bonita | noche! | Vuelva | pronto.", "What | pretty | night! | Come-back | soon.", "What a lovely night! Come back soon.")],
  // the learner
  lt_a_loteria: [t("¡Lotería!", "Lotería!", "Lotería!")],
};

const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** What the learner may say: the shout, and each card's name when reading the board back. */
export const LOTERIA_ACCEPT: Record<string, string[]> = {
  lt_a_loteria: ["loteria", "loteria loteria", "buena", "gane", "yo gane", "loteria gane"],
  ...Object.fromEntries(Object.entries(LOTERIA_CARD_LINES).map(([key, [line]]) => {
    const words = plain(line.en).replace(/\|/g, " ").replace(/\s+/g, " ").trim();
    return [key, [words, words.replace(/^(el|la|las|los) /, "")]];
  })),
};
