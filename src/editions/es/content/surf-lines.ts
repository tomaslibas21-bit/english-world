// The surf mini-game's spoken lines (x01-surf; cue list in the shared notes surf/CUES.md, 15 Nov 2026). Nayeli, a surf
// instructor from Puerto Escondido, says tú to the learner and calls short commands; the learner answers her aloud
// and acts on them (18 Nov 2026: the lesson is a conversation, one line of hers, then the learner's turn). One key
// `sg_<id>` per cue (the engine in src/game/surf/ looks them up by id); the `a_…` and `b_…` lines are the learner's
// own, said by them (the microphone) or for them (a tap: the voice the learner's examples have).
// Mexico is the base text; `neutral:` only where a word is Mexican-only (mera, chido, olón, ya estuvo, ¡va!); `spain:`
// where a Spaniard says it otherwise (coger, túmbate, pequeña, el invento, delante, the perfect for what just
// happened, Spain's surf slang in the rewards). The situation spreads SURF_LINES into its lines and SURF_MERGES into
// its merges. The word notes (src/editions/es/content/word-notes.ts) carry the same texts as the flags below.

import type { MergeRecord } from "@/content/merges";
import type { SentSrc } from "@/content/types";
import { t } from "@/content/dsl";

// ---------------------------------------------------------------------------
// Flags

const F_ESPUMA = "espuma: “foam”: the whitewater of a broken wave, where beginners learn.";
const F_TABLA = "tabla: “board”; in the water, a surfboard (una tabla de surf).";
const F_SERIE = "la serie: a set, the group of bigger waves that comes every few minutes.";
const F_ROMPIENTE = "la rompiente: the break, where the waves break.";
const F_CRESTA = "la cresta: the crest, the top of the wave.";
const F_CORREA = "la correa: the leash that ties the board to your ankle.";
const F_INVENTO = "el invento: “the invention”: Spain's surfers' word for the leash.";
const F_MERA = "Mexican: mera = the very one; ¡esa mera! = that's the one!";
const F_DALE = "¡Dale!: “give it”: go for it! / go ahead!";
const F_OLON = "olón: ola + -ón, the augmentative: a huge wave (Mexican surf slang).";
const F_REVOLCON = "revolcón: revolcar (to tumble) + -ón, the augmentative: a wipeout, being rolled by the wave.";
const F_CHIDO = "Mexican: chido = cool.";
const F_CHIQUITA = "chiquita: chica (small) + -ita, the diminutive: tiny.";
const F_BODY = "Spanish uses the (el, la, los, las) for your own body parts, where English says your.";
const F_MENUDO = "menudo before a noun, in Spain: what a…";
const F_VAYA = "vaya before a noun, in Spain: what a…";
const F_GREEN = "olas verdes: “green waves”: waves that haven't broken yet.";
const F_ACCIDENTAL = "The accidental se: “it went away on you”: it happened, nobody's fault.";
const F_ATRAS_DE = "Mexican: atrás de = behind (detrás de).";
const F_DESTIEMPO = "a destiempo: at the wrong moment.";
const F_A_MI = "a mí / a ti repeats the person for emphasis: it was MY (YOUR) turn.";
const F_TRANQUI = "tranqui: short for tranquilo: relax, no stress.";
const F_VALE = "vale: okay, Spain's everyday yes.";
const refl = (word: string, verb: string, pron: string) => `${word} = ${verb} + ${pron}: the pronoun joins the command.`;

// ---------------------------------------------------------------------------
// Multiword units (spread into the situation's `merges`)

const LEX = (split: string, minimal = "All words form the expression."): MergeRecord => ({ reason: "lexical_expression", split, minimal, code: "S-LEX" });
const FUSE = (split: string, minimal = "Pronoun and verb."): MergeRecord => ({ reason: "grammatical_fusion", split, minimal, code: "S-SE" });

export const SURF_MERGES: Record<string, MergeRecord> = {
  "nos quedamos": FUSE("nos → ourselves + quedamos → we stay: the reflexive verb quedarse = we stay."),
  "atrás de": LEX("atrás → behind + de → of leaves a stray of; Mexican preposition = behind."),
  "a por": LEX("a → to + por → for: Spain's ir a por = to go for (something)."),
  "más allá de": LEX("más → more + allá → there + de → of; the preposition = beyond, past."),
  "paddle surf": LEX("Spain's name for stand-up paddleboarding, an English loan.", "Two words of one name."),
  "por debajo": LEX("por → by + debajo → below; = underneath."),
  "date la vuelta": LEX("date → give yourself + la → the + vuelta → turn; = turn around."),
  "de pie": LEX("de → of + pie → foot; = standing, on your feet."),
  "eso es": LEX("eso → that + es → is; praise = that's it."),
  "me tocaba": FUSE("me → to me + tocaba → it was touching: tocarle a alguien = to be someone's turn."),
  "te tocaba": FUSE("te → to you + tocaba → it was touching: tocarle a alguien = to be someone's turn."),
  "se te fue": FUSE("se → itself + te → on you + fue → it went: the accidental se = it got away from you.", "Three words."),
  "me levanté": FUSE("me → myself + levanté → I raised: the reflexive verb levantarse = I got up."),
  "te levantaste": FUSE("te → yourself + levantaste → you raised: the reflexive verb levantarse = you got up."),
  "antes de tiempo": LEX("antes → before + de → of + tiempo → time; = too early.", "Three words."),
  "demasiado pronto": LEX("demasiado → too + pronto → soon; Spain's phrase = too early."),
  "lo suficiente": LEX("lo → it + suficiente → enough; the adverb = enough."),
  "a tiempo": LEX("a → at + tiempo → time; = in time."),
  "me incliné": FUSE("me → myself + incliné → I tilted: the reflexive verb inclinarse = I leaned."),
  "te inclinaste": FUSE("te → yourself + inclinaste → you tilted: the reflexive verb inclinarse = you leaned."),
  "a destiempo": LEX("a → at + destiempo → off-time; = at the wrong moment."),
  "en cuanto": LEX("en → in + cuanto → how much; the conjunction = as soon as."),
  "a que": LEX("a → to + que → that; esperar a que = to wait until."),
  "de enfrente": LEX("de → of + enfrente → in front; after a noun = front (the front foot)."),
  "de delante": LEX("de → of + delante → in front; Spain, after a noun = front (the front foot)."),
  "a donde": LEX("a → to + donde → where; = where (to)."),
  "nos caemos": FUSE("nos → ourselves + caemos → we fall: the verb caerse = we fall."),
  "ya estuvo": LEX("ya → already + estuvo → it was; Mexican = that's enough, we're done."),
  "de regreso": LEX("de → of + regreso → return; = back."),
  "de vuelta": LEX("de → of + vuelta → return; = back."),
  "nos vemos": FUSE("nos → each other + vemos → we see; the goodbye = see you."),
};

// ---------------------------------------------------------------------------
// The lines

export const SURF_LINES: Record<string, SentSrc[]> = {
  // --- start ---------------------------------------------------------------------------------------
  sg_start_beg: [t("Hoy | nos quedamos | en | la | espuma: | olas | chiquitas | y | tabla | grande.", "Today | we stay | in | the | whitewater: | waves | tiny | and | board | big.",
    "Today we're staying in the whitewater: small waves and a big board.", { flags: { 4: F_ESPUMA, 6: F_CHIQUITA, 8: F_TABLA },
      spain: t("Hoy | toca | espuma: | olas | pequeñas | y | tabla | grande.", "Today | it's time for | whitewater: | waves | small | and | board | big.",
        "Today we're staying in the whitewater: small waves and a big board.", { flags: { 1: "toca: “it's the turn of”: hoy toca… = today it's…", 2: F_ESPUMA, 6: F_TABLA } }) })],
  sg_start_adv: [t("Hoy | vamos | por | las | olas | verdes, | atrás de | la | rompiente.", "Today | we're going | for | the | waves | green, | behind | the | break.",
    "Today we're going for green waves, out past the break.", { flags: { 5: F_GREEN, 6: F_ATRAS_DE, 8: F_ROMPIENTE },
      neutral: t("Hoy | vamos | por | las | olas | verdes, | más allá de | la | rompiente.", "Today | we're going | for | the | waves | green, | beyond | the | break.",
        "Today we're going for green waves, out past the break.", { flags: { 5: F_GREEN, 8: F_ROMPIENTE } }),
      spain: t("Hoy | vamos | a por | olas | verdes, | más allá de | la | rompiente.", "Today | we're going | for | waves | green, | beyond | the | break.",
        "Today we're going for green waves, out past the break.", { flags: { 2: "ir a por: Spain's “to go for” (something).", 4: F_GREEN, 7: F_ROMPIENTE } }) })],
  sg_listen: [t("Yo | te | digo | qué | hacer. | Tú | escucha | y | hazlo.", "I | (to) you | tell | what | to do. | You | listen | and | do it.",
    "I tell you what to do. You listen and do it.", { flags: { 8: refl("hazlo", "haz (do)", "lo (it)") } })],
  sg_board_ask: [t("¿Qué | tabla | quieres?", "Which | board | do you want?", "Which board do you want?", { flags: { 1: F_TABLA } })],
  sg_board_take_long: [t("Agarra | la | tabla | larga, | la | de | espuma.", "Grab | the | board | long, | the one | of | foam.", "Grab the long board, the foam one.",
    { flags: { 4: "la de: “the one of”: la de espuma = the foam one." },
      spain: t("Coge | la | tabla | larga, | la | de | espuma.", "Grab | the | board | long, | the one | of | foam.", "Grab the long board, the foam one.",
        { flags: { 0: "coger: to take, to grab (Spain's everyday verb).", 4: "la de: “the one of”: la de espuma = the foam one." } }) })],
  sg_board_take_short: [t("Llévate | la | tabla | corta.", "Take | the | board | short.", "Take the shortboard.", { flags: { 0: refl("llévate", "lleva (take)", "te (for yourself)") } })],
  sg_board_no: [t("Esa | no. | ¡La | otra!", "That one | no. | The | other!", "Not that one. The other one!")],
  sg_board_yes: [t("¡Esa | mera!", "That | very one!", "That's the one!", { flags: { 1: F_MERA },
    neutral: t("¡Esa | es!", "That one | it is!", "That's the one!") })],
  sg_b_long: [t("la | tabla | larga | de | espuma", "the | board | long | of | foam", "the long foam board")],
  sg_b_short: [t("la | tabla | corta", "the | board | short", "the shortboard")],
  sg_b_sup: [t("la | tabla | de | paddle", "the | board | of | paddle", "the paddleboard",
    { spain: t("la | tabla | de | paddle surf", "the | board | of | stand-up paddle", "the paddleboard") })],
  sg_leash: [t("Ponte | la | correa | en | el | tobillo.", "Put on | the | leash | on | the | ankle.", "Put the leash on your ankle.",
    { flags: { 0: refl("ponte", "pon (put)", "te (on yourself)"), 2: F_CORREA, 4: F_BODY },
      spain: t("Ponte | el | invento | en | el | tobillo.", "Put on | the | leash | on | the | ankle.", "Put the leash on your ankle.",
        { flags: { 0: refl("ponte", "pon (put)", "te (on yourself)"), 2: F_INVENTO, 4: F_BODY } }) })],
  sg_go_in: [t("¡Vamos | al | agua!", "Let's go | to the | water!", "Let's get in the water!")],

  // --- paddling out --------------------------------------------------------------------------------
  sg_lie: [t("Acuéstate | en | la | tabla.", "Lie down | on | the | board.", "Lie down on the board.", { flags: { 0: refl("acuéstate", "acuesta (lay)", "te (yourself)") },
    spain: t("Túmbate | en | la | tabla.", "Lie down | on | the | board.", "Lie down on the board.", { flags: { 0: "túmbate = tumba (lay down) + te (yourself); Spain says tumbarse for lying down." } }) })],
  sg_paddle: [t("¡Rema!", "Paddle!", "Paddle!")],
  sg_paddle_hard: [t("¡Más | fuerte!", "More | hard!", "Harder!")],
  sg_paddle_more: [t("¡Rema, | rema, | no pares!", "Paddle, | paddle, | don't stop!", "Paddle, paddle, don't stop!")],
  sg_paddle_long: [t("Brazadas | largas.", "Strokes | long.", "Long strokes.")],
  sg_wave_duck: [t("¡Ola! | ¡Pasa | por debajo!", "Wave! | Go | underneath!", "Wave! Go under it!")],
  sg_duck_ok: [t("¡Eso! | ¡Bien | pasada!", "That's it! | Well | passed!", "Yes! Nice one!", { flags: { 2: "pasada: “passed”, agreeing with la ola." } })],
  sg_duck_miss: [t("¡Uy! | Te | arrastró | la | ola. | No pasa nada.", "Whoa! | You | swept back | the | wave. | No worries.", "Whoa! The wave pushed you back. No worries.",
    { flags: { 2: "The subject comes last: la ola te arrastró = the wave swept you back." },
      spain: t("¡Uy! | Te ha arrastrado | la | ola. | No pasa nada.", "Whoa! | You it's swept back | the | wave. | No worries.", "Whoa! The wave pushed you back. No worries.",
        { flags: { 1: "The subject comes last: la ola te ha arrastrado = the wave has swept you back." } }) })],
  sg_almost: [t("¡Ya | casi | llegas!", "Already | almost | you arrive!", "You're almost there!")],
  sg_arrive: [t("Ya | estamos. | Siéntate | en | la | tabla.", "Already | we are. | Sit up | on | the | board.", "Here we are. Sit up on your board.",
    { flags: { 2: refl("siéntate", "sienta (sit)", "te (yourself)") } })],

  // --- waiting for the set -------------------------------------------------------------------------
  sg_wait: [t("Ahora, | a | esperar | la | serie.", "Now, | to | wait for | the | set.", "Now we wait for the set.",
    { flags: { 1: "a + an infinitive: a short way to say let's / now we…", 4: F_SERIE } })],
  sg_look_horizon: [t("Mira | el | horizonte.", "Look at | the | horizon.", "Watch the horizon.")],
  sg_not_this: [t("Esta | no…", "This one | no…", "Not this one…")],
  sg_too_small: [t("Esta | está | muy | chiquita.", "This one | is | very | tiny.", "This one's too small.", { flags: { 3: F_CHIQUITA },
    spain: t("Esta | es | muy | pequeña.", "This one | is | very | small.", "This one's too small.") })],
  sg_let_pass: [t("Déjala | pasar.", "Let it | go by.", "Let it go by.", { flags: { 0: refl("déjala", "deja (let)", "la (it, the wave)") } })],
  sg_not_that: [t("¡Espera! | Esa | no era.", "Wait! | That one | it wasn't.", "Wait! That wasn't the one.")],
  sg_this_one: [t("¡Esta | sí!", "This one | yes!", "This one!")],
  sg_turn: [t("¡Gira | la | tabla!", "Turn | the | board!", "Turn your board around!",
    { spain: t("¡Date la vuelta!", "Turn around!", "Turn around!", { flags: { 0: "date la vuelta: “give yourself the turn” = turn around." } }) })],
  sg_turn_shore: [t("¡Apunta | a | la | playa!", "Point | at | the | beach!", "Point it at the beach!")],

  // --- catching it ---------------------------------------------------------------------------------
  sg_paddle_now: [t("¡Rema, | rema, | rema!", "Paddle, | paddle, | paddle!", "Paddle, paddle, paddle!")],
  sg_coming: [t("¡Ahí | viene!", "There | it comes!", "Here it comes!")],
  sg_now_up: [t("¡Ahora! | ¡Levántate!", "Now! | Get up!", "Now! Pop up!", { flags: { 1: refl("levántate", "levanta (raise)", "te (yourself)") },
    spain: t("¡Ahora! | ¡Ponte | de pie!", "Now! | Get | on your feet!", "Now! Pop up!", { flags: { 1: refl("ponte", "pon (put)", "te (yourself)") } }) })],
  sg_up_ok: [t("¡Arriba! | ¡Eso es!", "Up! | That's it!", "You're up! That's it!")],

  // --- riding: corrections -------------------------------------------------------------------------
  sg_lean_left: [t("Inclínate | a la izquierda.", "Lean | to the left.", "Lean left.", { flags: { 0: refl("inclínate", "inclina (tilt)", "te (yourself)") } })],
  sg_lean_right: [t("Inclínate | a la derecha.", "Lean | to the right.", "Lean right.", { flags: { 0: refl("inclínate", "inclina (tilt)", "te (yourself)") } })],
  sg_left_short: [t("¡A la izquierda!", "To the left!", "Left!")],
  sg_right_short: [t("¡A la derecha!", "To the right!", "Right!")],
  sg_knees: [t("Dobla | las | rodillas.", "Bend | the | knees.", "Bend your knees.", { flags: { 1: F_BODY } })],
  sg_lower: [t("¡Más | abajo! | ¡Agáchate!", "More | down! | Crouch!", "Lower! Get down!", { flags: { 2: refl("agáchate", "agacha (lower)", "te (yourself)") } })],
  sg_look_front: [t("Mira | al | frente.", "Look | to the | front.", "Eyes forward.")],
  sg_not_feet: [t("¡No mires | los | pies!", "Don't look at | the | feet!", "Don't look at your feet!", { flags: { 1: F_BODY } })],
  sg_weight_fwd: [t("Peso | adelante.", "Weight | forward.", "Weight forward.",
    { spain: t("Peso | hacia | delante.", "Weight | toward | the front.", "Weight forward.") })],
  sg_speed: [t("¡Más | velocidad! | Peso | adelante.", "More | speed! | Weight | forward.", "More speed! Weight forward.",
    { spain: t("¡Más | velocidad! | Peso | hacia | delante.", "More | speed! | Weight | toward | the front.", "More speed! Weight forward.") })],
  sg_up_face: [t("¡Sube | a | la | cresta!", "Go up | to | the | crest!", "Climb to the top of the wave!", { flags: { 3: F_CRESTA } })],
  sg_down_face: [t("¡Baja, | baja!", "Go down, | go down!", "Down, down!")],
  sg_turn_left: [t("¡Gira | a la izquierda!", "Turn | to the left!", "Turn left!")],
  sg_turn_right: [t("¡Gira | a la derecha!", "Turn | to the right!", "Turn right!")],
  sg_trick: [t("¡Ahora, | un | truco! | ¡Salta!", "Now, | a | trick! | Jump!", "Now, a trick! Jump!")],
  sg_hold: [t("¡Así, | así! | ¡Aguanta!", "Like that, | like that! | Hold on!", "That's it, that's it! Hold it!")],
  sg_good1: [t("¡Eso!", "That's it!", "Yes!")],
  sg_good2: [t("¡Muy | bien!", "Very | well!", "Great job!")],
  sg_good3: [t("¡Perfecto!", "Perfect!", "Perfect!")],

  // --- line-up etiquette ---------------------------------------------------------------------------
  sg_prev_mine: [t("La | anterior | fue | mía.", "The | previous one | was | mine.", "I had the last one.",
    { spain: t("La | anterior | ha sido | mía.", "The | previous one | has been | mine.", "I had the last one.") })],
  sg_prev_yours: [t("La | anterior | fue | tuya.", "The | previous one | was | yours.", "You had the last one.",
    { spain: t("La | anterior | ha sido | tuya.", "The | previous one | has been | yours.", "You had the last one.") })],
  sg_q_go: [t("¿Vas?", "Are you going?", "You going?")],
  sg_a_go: [t("¡Voy!", "I'm going!", "I'm going!")],
  sg_a_yours: [t("Te toca.", "It's your turn.", "Your turn.")],
  sg_et_go_ok: [t("¡Dale! | Es | tuya.", "Go for it! | It's | yours.", "Go for it! It's yours.", { flags: { 0: F_DALE },
    spain: t("¡Venga, | es | tuya!", "Come on, | it's | yours!", "Go for it! It's yours.", { flags: { 0: "venga: “come”: Spain's go on! / come on!" } }) })],
  sg_et_wait_ok: [t("Gracias. | Tú | vas | en | la | siguiente.", "Thanks. | You | go | on | the | next one.", "Thanks. You take the next one.",
    { spain: t("Gracias. | Tú | coges | la | siguiente.", "Thanks. | You | catch | the | next one.", "Thanks. You take the next one.",
      { flags: { 2: "coger una ola: Spain's verb for catching a wave." } }) })],
  sg_et_go_wrong: [t("¡Oye! | Me tocaba | a | mí. | En | el | agua | se respeta | el | turno.", "Hey! | It was my turn | — | me. | In | the | water | is respected | the | turn.",
    "Hey! It was my turn. Out here, you wait your turn.", { flags: { 2: F_A_MI } })],
  sg_et_wait_wrong: [t("No, | te tocaba | a | ti. | ¡La | dejaste | ir!", "No, | it was your turn | — | you. | It | you-let | go!", "No, it was your turn. You let it go!",
    { flags: { 2: F_A_MI, 4: "la before a verb is a pronoun: it (the wave)." },
      spain: t("No, | te tocaba | a | ti. | ¡La has dejado | pasar!", "No, | it was your turn | — | you. | You've let it | go by!", "No, it was your turn. You let it go!",
        { flags: { 2: F_A_MI } }) })],

  // --- a fall, a missed wave -----------------------------------------------------------------------
  sg_wipeout: [t("¡Qué | revolcón!", "What | a wipeout!", "What a wipeout!", { flags: { 1: F_REVOLCON },
    spain: t("¡Menudo | revolcón!", "What | a wipeout!", "What a wipeout!", { flags: { 0: F_MENUDO, 1: F_REVOLCON } }) })],
  sg_you_ok: [t("¿Estás | bien?", "Are you | well?", "You okay?")],
  sg_missed: [t("Se te fue | la | ola.", "Got away from you | the | wave.", "The wave got away from you.", { flags: { 0: F_ACCIDENTAL },
    spain: t("Se te ha escapado | la | ola.", "Has gotten away from you | the | wave.", "The wave got away from you.", { flags: { 0: F_ACCIDENTAL } }) })],
  sg_what_happened: [t("¿Qué | pasó?", "What | happened?", "What happened?",
    { spain: t("¿Qué | ha pasado?", "What | has happened?", "What happened?") })],
  sg_a_late: [t("Me levanté | tarde.", "I got up | late.", "I popped up too late.",
    { spain: t("Me he levantado | tarde.", "I've gotten up | late.", "I popped up too late.") })],
  sg_a_early: [t("Me levanté | antes de tiempo.", "I got up | too early.", "I popped up too early.",
    { spain: t("Me he levantado | demasiado pronto.", "I've gotten up | too early.", "I popped up too early.") })],
  sg_a_nopaddle: [t("No remé | lo suficiente.", "I didn't paddle | enough.", "I didn't paddle enough.",
    { spain: t("No he remado | lo suficiente.", "I haven't paddled | enough.", "I didn't paddle enough.") })],
  sg_a_back: [t("Puse | el | peso | atrás.", "I put | the | weight | back.", "My weight was too far back.",
    { spain: t("He echado | el | peso | hacia | atrás.", "I've put | the | weight | toward | the back.", "My weight was too far back.") })],
  sg_a_knees: [t("No doblé | las | rodillas.", "I didn't bend | the | knees.", "I didn't bend my knees.", { flags: { 1: F_BODY },
    spain: t("No he doblado | las | rodillas.", "I haven't bent | the | knees.", "I didn't bend my knees.", { flags: { 1: F_BODY } }) })],
  sg_a_feet: [t("Miré | los | pies.", "I looked at | the | feet.", "I looked at my feet.", { flags: { 1: F_BODY },
    spain: t("Me he mirado | los | pies.", "I've looked at | the | feet.", "I looked at my feet.", { flags: { 0: "me he mirado: mirarse, “to look at yourself”, for your own body.", 1: F_BODY } }) })],
  sg_a_lean: [t("No me incliné | a tiempo.", "I didn't lean | in time.", "I didn't lean in time.",
    { spain: t("No me he inclinado | a tiempo.", "I haven't leaned | in time.", "I didn't lean in time.") })],
  sg_a_side: [t("Me incliné | al | otro | lado.", "I leaned | to the | other | side.", "I leaned the wrong way.",
    { spain: t("Me he inclinado | hacia | el | otro | lado.", "I've leaned | toward | the | other | side.", "I leaned the wrong way.") })],
  sg_a_trick: [t("Salté | mal.", "I jumped | badly.", "I messed up the jump.",
    { spain: t("He saltado | mal.", "I've jumped | badly.", "I messed up the jump.") })],
  sg_r_exact: [t("¡Exacto!", "Exactly!", "Exactly!")],
  sg_r_no: [t("No, | mira:", "No, | look:", "No, look:")],
  sg_r_late: [t("Te levantaste | tarde.", "You got up | late.", "You popped up too late.",
    { spain: t("Te has levantado | tarde.", "You've gotten up | late.", "You popped up too late.") })],
  sg_r_early: [t("Te levantaste | antes de tiempo.", "You got up | too early.", "You popped up too early.",
    { spain: t("Te has levantado | demasiado pronto.", "You've gotten up | too early.", "You popped up too early.") })],
  sg_r_nopaddle: [t("No remaste | lo suficiente.", "You didn't paddle | enough.", "You didn't paddle enough.",
    { spain: t("No has remado | lo suficiente.", "You haven't paddled | enough.", "You didn't paddle enough.") })],
  sg_r_back: [t("Pusiste | el | peso | atrás.", "You put | the | weight | back.", "Your weight was too far back.",
    { spain: t("Has echado | el | peso | hacia | atrás.", "You've put | the | weight | toward | the back.", "Your weight was too far back.") })],
  sg_r_knees: [t("No doblaste | las | rodillas.", "You didn't bend | the | knees.", "You didn't bend your knees.", { flags: { 1: F_BODY },
    spain: t("No has doblado | las | rodillas.", "You haven't bent | the | knees.", "You didn't bend your knees.", { flags: { 1: F_BODY } }) })],
  sg_r_feet: [t("Miraste | los | pies.", "You looked at | the | feet.", "You looked at your feet.", { flags: { 1: F_BODY },
    spain: t("Te has mirado | los | pies.", "You've looked at | the | feet.", "You looked at your feet.", { flags: { 0: "te has mirado: mirarse, “to look at yourself”, for your own body.", 1: F_BODY } }) })],
  sg_r_lean: [t("No te inclinaste | a tiempo.", "You didn't lean | in time.", "You didn't lean in time.",
    { spain: t("No te has inclinado | a tiempo.", "You haven't leaned | in time.", "You didn't lean in time.") })],
  sg_r_side: [t("Te inclinaste | al | otro | lado.", "You leaned | to the | other | side.", "You leaned the wrong way.",
    { spain: t("Te has inclinado | hacia | el | otro | lado.", "You've leaned | toward | the | other | side.", "You leaned the wrong way.") })],
  sg_r_trick: [t("Saltaste | a destiempo.", "You jumped | at the wrong time.", "You jumped at the wrong moment.", { flags: { 1: F_DESTIEMPO },
    spain: t("Has saltado | a destiempo.", "You've jumped | at the wrong time.", "You jumped at the wrong moment.", { flags: { 1: F_DESTIEMPO } }) })],
  sg_tip_late: [t("Levántate | en cuanto | yo | diga | «ahora».", "Get up | as soon as | I | say | “now.”", "Pop up as soon as I say “now.”",
    { flags: { 0: refl("levántate", "levanta (raise)", "te (yourself)"), 3: "diga: the subjunctive after en cuanto (as soon as), for something still to come." } })],
  sg_tip_early: [t("Espera | a que | la | ola | te | empuje.", "Wait | until | the | wave | you | pushes.", "Wait for the wave to push you.",
    { flags: { 5: "empuje: the subjunctive after esperar a que (wait until)." } })],
  sg_tip_nopaddle: [t("Rema | fuerte | hasta | sentir | el | empujón.", "Paddle | hard | until | feeling | the | push.", "Paddle hard until you feel the push.",
    { flags: { 5: "empujón: empuje (push) + -ón, the augmentative: a big shove." } })],
  sg_tip_back: [t("El | peso | va | adelante, | sobre | el | pie | de enfrente.", "The | weight | goes | forward, | on | the | foot | in front.", "Keep your weight forward, on your front foot.",
    { spain: t("El | peso | va | delante, | sobre | el | pie | de delante.", "The | weight | goes | in front, | on | the | foot | in front.", "Keep your weight forward, on your front foot.") })],
  sg_tip_knees: [t("Con | las | rodillas | dobladas | no te caes.", "With | the | knees | bent | you don't fall.", "Keep your knees bent and you won't fall.", { flags: { 1: F_BODY } })],
  sg_tip_feet: [t("A donde | miras, | vas.", "Where | you look, | you go.", "You go where you look.")],
  sg_tip_lean: [t("Escucha | y | reacciona | rápido.", "Listen | and | react | fast.", "Listen and react fast.")],
  sg_tip_side: [t("Izquierda | es | izquierda. | ¡Tranqui!", "Left | is | left. | Relax!", "Left is left. Relax!",
    { flags: { 3: F_TRANQUI } })],
  sg_tip_trick: [t("El | truco, | solo | con | la | tabla | estable.", "The | trick, | only | with | the | board | steady.", "Only try a trick when the board is steady.")],
  sg_nothing: [t("No pasa nada. | Todos | nos caemos.", "No worries. | Everyone | we fall.", "No worries. Everybody falls.",
    { flags: { 2: "todos nos caemos: “all of us fall”: the verb says we." } })],
  sg_learn: [t("Así | se aprende.", "That's how | one learns.", "That's how you learn.")],
  sg_again_q: [t("¿Otra | vez?", "Another | time?", "Want to go again?")],
  sg_a_again: [t("Otra | vez.", "Another | time.", "Again.")],
  sg_a_enough: [t("Ya estuvo | por | hoy.", "That's it | for | today.", "That's enough for today.", { flags: { 0: "Mexican: ya estuvo = that's enough, we're done." },
    neutral: t("Suficiente | por | hoy.", "Enough | for | today.", "That's enough for today."),
    spain: t("Por | hoy, | ya está.", "For | today, | that's it.", "That's enough for today.") })],

  // --- a good ride, the end ------------------------------------------------------------------------
  sg_shore: [t("¡Hasta | la | orilla!", "Until | the | shore!", "All the way to the shore!")],
  sg_first_wave: [t("¡Tu | primera | ola! | ¡Felicidades!", "Your | first | wave! | Congratulations!", "Your first wave! Congrats!",
    { spain: t("¡Tu | primera | ola! | ¡Enhorabuena!", "Your | first | wave! | Congratulations!", "Your first wave! Congrats!",
      { flags: { 3: "enhorabuena: Spain's congratulations for something you did." } }) })],
  sg_slang1: [t("¡Qué | olón!", "What | a huge wave!", "What a monster wave!", { flags: { 1: F_OLON },
    neutral: t("¡Tremenda | ola!", "Tremendous | wave!", "What a monster wave!", { flags: { 0: "tremenda before a noun: huge, amazing." } }),
    spain: t("¡Menuda | ola!", "What | a wave!", "What a monster wave!", { flags: { 0: F_MENUDO } }) })],
  sg_slang2: [t("¡Bien | chido!", "Very | cool!", "So cool!", { flags: { 1: F_CHIDO },
    neutral: t("¡Genial!", "Great!", "Awesome!"),
    spain: t("¡Qué | pasada!", "What | a blast!", "That was amazing!", { flags: { 1: "¡qué pasada!: Spain's slang for amazing (pasada: something over the top)." } }) })],
  sg_slang3: [t("¡La | rompiste!", "It | you broke!", "You crushed it!", { flags: { 0: "romperla, “to break it”: slang for doing great; la stands for nothing in particular." },
    spain: t("¡Lo has clavado!", "You've nailed it!", "You crushed it!", { flags: { 0: "clavarlo: “to nail it”." } }) })],
  sg_slang4: [t("¡Qué | buena | ola!", "What | good | wave!", "What a great wave!",
    { spain: t("¡Vaya | olaza!", "What | a huge wave!", "What a great wave!", { flags: { 0: F_VAYA, 1: "olaza: ola + -aza, the augmentative: a huge wave." } }) })],
  sg_another: [t("¡Va | otra! | Rema | de regreso.", "Here goes | another! | Paddle | back.", "Let's get another! Paddle back out.",
    { flags: { 0: "Mexican: va = okay, let's go; ¡va otra! = let's do another one." },
      neutral: t("¡Vamos | por | otra! | Rema | de vuelta.", "Let's go | for | another! | Paddle | back.", "Let's get another! Paddle back out."),
      spain: t("¡A por | otra! | Rema | de vuelta.", "Go for | another! | Paddle | back.", "Let's get another! Paddle back out.",
        { flags: { 0: "a por: Spain's “(go) for”: ¡a por otra! = let's get another!" } }) })],
  sg_bye: [t("¡Nos vemos | en | el | agua!", "See you | in | the | water!", "See you in the water!")],

  // --- the talk between two moves (18 Nov 2026) ----------------------------------------------------
  sg_not_yet: [t("¡Todavía | no! | Espera…", "Yet | not! | Wait…", "Not yet! Wait…")],
  sg_ride_q: [t("¿Todo | bien?", "Everything | well?", "All good?")],
  sg_easy: [t("Tranqui, | vas | bien.", "Relax, | you're going | well.", "Relax, you're doing fine.", { flags: { 0: F_TRANQUI } })],

  // --- the learner's side of it: short answers that keep the talk going ----------------------------
  sg_a_perfect: [t("¡Perfecto!", "Perfect!", "Perfect!")],
  sg_a_ok: [t("Está | bien.", "It's | fine.", "Okay.", { spain: t("Vale.", "Okay.", "Okay.", { flags: { 0: F_VALE } }) })],
  sg_a_understood: [t("Entendido.", "Understood.", "Got it.")],
  sg_a_ready: [t("¡{sm:Listo|sf:Lista}!", "Ready!", "Ready!")],
  sg_a_coming: [t("¡Ya | voy!", "Already | I'm coming!", "I'm coming!")],
  sg_a_vamos: [t("¡Vamos!", "Let's go!", "Let's go!")],
  sg_a_and_now: [t("¿Y | ahora?", "And | now?", "And now?")],
  sg_a_far: [t("¡Uf! | ¡Qué | lejos!", "Phew! | How | far!", "Phew! That was far!")],
  sg_a_this: [t("¿Esta?", "This one?", "This one?")],
  sg_a_this2: [t("¿Y | esta?", "And | this one?", "What about this one?")],
  sg_a_now: [t("¿Ahora?", "Now?", "Now?")],
  sg_a_fine: [t("Estoy | bien.", "I'm | fine.", "I'm fine.")],
  sg_a_water: [t("¡Tragué | agua!", "I swallowed | water!", "I swallowed water!",
    { spain: t("¡He tragado | agua!", "I've swallowed | water!", "I swallowed water!") })],
  sg_a_allgood: [t("¡Todo | bien!", "Everything | well!", "All good!")],
  sg_a_soso: [t("Más | o | menos.", "More | or | less.", "So-so.")],
  sg_a_thanks: [t("¡Gracias!", "Thanks!", "Thanks!")],
  sg_a_fun: [t("¡Qué | divertido!", "How | fun!", "That was fun!")],
};
