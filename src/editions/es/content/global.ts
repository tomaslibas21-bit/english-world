// Conversation skills available in every situation, in Spanish (replaces src/content/global.ts in the Spanish
// edition): asking to repeat ("¿Mande?"), to slow down, to spell or write something down, saying you are still
// learning, greetings, "¿Cómo está?", thanks and goodbyes.
//
// Address: {u:…|t:…} in the Spanish = usted (strangers, staff: the default) / tú (an NPC marked `informal`). The
// choice sits inside one unit ("¿{u:Puede|t:Puedes} | repetir?"). In hints it is how the learner addresses the NPC.

import type { GlobalContent, ConvCtx } from "../../../convo/dialogue";
import type { HintGroup, SentSrc } from "../../../content/types";

const t = (en: string, lt: string, nat: string, extra: Partial<SentSrc> = {}): SentSrc => ({ en, lt, nat, ...extra });

export const GLOBAL_LINES: Record<string, SentSrc[]> = {
  g_not_understood: [
    t("Perdón, | no {u:le|t:te} entendí.", "Sorry, | I didn't understand you.", "Sorry, I didn't understand you."),
    t("Perdón, | ¿{u:puede|t:puedes} | repetir?", "Sorry, | can you | repeat?", "Sorry, could you say that again?"),
    t("{u:Disculpe|t:Disculpa}, | no entendí.", "Sorry, | I didn't understand.", "Sorry, I didn't understand."),
  ],
  g_yes_what: [
    t("¡Claro! | ¿En | qué | {u:le|t:te} | puedo | ayudar?", "Sure! | In | what | you | I-can | help?", "Sure! How can I help you?",
      { flags: { 4: "le/te: “you” as the one being helped (usted: le, tú: te)." } }),
  ],
  g_no_ok: [
    t("Está bien, | no hay problema.", "Okay, | no problem.", "Okay, no problem."),
  ],
  /** A neutral reply when an understood answer would otherwise get none (dialogue.ts). */
  g_ack: [
    t("Ya veo.", "I see.", "I see."),
    t("Entendido.", "Got it.", "Got it."),
    t("Muy | bien.", "Very | good.", "Okay."),
  ],
  /** A name heard only by its sound: the person checks it, and the learner hears it said right (convo/soundalike.ts). */
  g_soundcheck: [
    t("Perdón, | ¿{X}?", "Sorry, | {X}?", "Sorry, {X}?"),
    t("Perdón, | ¿{u:dijo|t:dijiste} | {X}?", "Sorry, | did you say | {X}?", "Sorry, did you say {X}?"),
  ],
  g_soundcheck_no: [
    t("¡Ay, | perdón! | ¿Me | lo | {u:repite|t:repites}?", "Oh, | sorry! | (To) me | it | you-repeat?", "Oh, sorry! Could you say it again?"),
    t("¡Me equivoqué! | ¿Qué | {u:dijo|t:dijiste}?", "My mistake! | What | did you say?", "My mistake! What did you say?"),
  ],
  g_repeat_intro: [
    t("¡Claro!", "Sure!", "Sure!"),
    t("Por supuesto.", "Of course.", "Of course."),
    t("Sin problema.", "No problem.", "No problem."),
  ],
  g_slow_intro: [
    t("Claro, | {u:le|t:te} | hablo | más despacio.", "Sure, | (to) you | I'll-speak | more slowly.", "Sure, I'll speak more slowly."),
    t("Por supuesto. | Lo | digo | despacio.", "Of course. | It | I'll-say | slowly.", "Of course. I'll say it slowly."),
  ],
  g_dont_understand: [
    t("No hay problema. | Lo | repito | más despacio.", "No problem. | It | I'll-repeat | more slowly.", "No problem. I'll say it again, more slowly."),
  ],
  g_learning: [
    t("¡No hay problema! | {u:Habla|t:Hablas} | muy | bien | español.", "No problem! | You speak | very | well | Spanish.", "No problem! Your Spanish is really good."),
    t("¡Está bien! | Lo | {u:está|t:estás} | haciendo | muy | bien.", "That's okay! | It | you're | doing | very | well.", "That's okay! You're doing great."),
  ],
  g_speak_slowly: [
    t("Hablo | despacio.", "I'll-speak | slowly.", "I'll speak slowly."),
    t("{u:Le|t:Te} | hablo | más despacio.", "(To) you | I'll-speak | more slowly.", "I'll speak more slowly."),
  ],
  g_welcome: [
    t("¡De nada!", "You're welcome!", "You're welcome!"),
    t("¡Con gusto!", "My pleasure!", "My pleasure!"),
    t("¡A la orden!", "At your service!", "Anytime!", { flags: { 0: "Mexican: what staff say after “gracias”." } }),
    t("¡No hay de qué!", "Don't mention it!", "Don't mention it!"),
  ],
  g_bye: [
    t("¡Adiós! | ¡Que | {u:tenga|t:tengas} | buen día!", "Bye! | (I hope) | you have | a good day!", "Bye! Have a good day!"),
    t("¡{u:Cuídese|t:Cuídate}!", "Take care!", "Take care!"),
    t("¡Nos vemos!", "See you!", "See you!"),
    t("¡Hasta luego! | ¡Que | {u:le|t:te} | vaya | bien!", "See you later! | (I hope) | (for) you | it-goes | well!", "See you! All the best!"),
  ],
  g_take_time: [
    t("Claro, | {u:tómese su tiempo|t:tómate tu tiempo}.", "Sure, | take your time.", "Sure, take your time."),
    t("Sin prisa.", "No rush.", "No rush."),
    t("{u:Tómese su tiempo|t:Tómate tu tiempo}.", "Take your time.", "Take your time."),
  ],
  g_no_worries: [
    t("¡No pasa nada!", "No worries!", "No worries!"),
    t("¡Está bien!", "That's okay!", "That's okay!"),
    t("¡{u:No se preocupe|t:No te preocupes}!", "Don't worry!", "Don't worry!"),
  ],
  g_howareyou_reply: [
    t("Bien, | gracias. | ¿Y | {u:usted|t:tú}?", "Good, | thanks. | And | you?", "Good, thanks. And you?"),
    t("Muy | bien, | gracias. | ¿Y | {u:usted|t:tú}?", "Very | well, | thanks. | And | you?", "Very well, thanks. And you?"),
    t("No me quejo. | ¿Y | {u:usted|t:tú}?", "I can't complain. | And | you?", "Can't complain. And you?"),
  ],
  g_glad: [
    t("¡Qué | bueno!", "How | good!", "Glad to hear it!"),
    t("¡Me alegro!", "I'm glad!", "Good to hear!"),
    t("¡Qué | bien!", "How | nice!", "Nice!"),
  ],
  g_asked_back: [
    t("Muy | bien, | gracias | por | preguntar.", "Very | well, | thanks | for | asking.", "Very well, thanks for asking!"),
    t("Bien, | gracias.", "Good, | thanks.", "Good, thanks!"),
    t("Pues | aquí | andamos, | gracias.", "Well | here | we-go-on, | thanks.", "Hanging in there, thanks!", { flags: { 2: "Mexican: “aquí andamos” = getting by, fine." } }),
  ],
  g_sorry_to_hear: [
    t("¡Ay, | lo siento!", "Oh, | I'm sorry!", "Oh no, I'm sorry to hear that."),
  ],
  g_hello: [
    t("¡Hola!", "Hi!", "Hi!"),
    t("¡Buenas!", "Hi!", "Hi!", { flags: { 0: "Short for buenos días / buenas tardes: a friendly hello at any time." } }),
  ],
  g_meaning: [
    t("¡Buena | pregunta! | {u:Déjeme|t:Déjame} | {u:mostrarle|t:mostrarte}.", "Good | question! | Let me | show you.", "Good question! Let me show you."),
    t("{u:Mire|t:Mira}, | {u:le|t:te} | explico.", "Look, | (to) you | I'll-explain.", "Here, let me explain."),
  ],
  g_write: [
    t("Claro, | {u:aquí tiene|t:aquí tienes}.", "Sure, | here you go.", "Sure, here you go."),
    t("No hay problema, | {u:aquí tiene|t:aquí tienes}.", "No problem, | here you go.", "No problem, here you go."),
  ],
  g_spell: [
    t("Se escribe | {$letters}.", "It's spelled | {$letters}.", "It's spelled {$letters}.", { say: "Se escribe: {$letters}." }),
    t("Claro: | {$letters}.", "Sure: | {$letters}.", "Sure: {$letters}.", { say: "Claro. {$letters}." }),
  ],
  g_which_word: [
    t("¿Qué | palabra?", "Which | word?", "Which word?"),
  ],
  g_nothing_to_write: [
    t("Ay, | no hay | nada | que | escribir.", "Oh, | there isn't | anything | to | write.", "Oh, there's nothing to write down."),
  ],
};

// ---------------------------------------------------------------------------

export const GLOBAL_MACROS: Record<string, string | string[]> = {
  could_you: "(puede | puedes | podria | podrias | me puede | me puedes | me podria | me podrias)",
  can_i: "(puedo | podria | se puede)",
  det: "(un | una | el | la | los | las | unos | unas | este | esta | ese | esa | mi | otro | otra)",
  greet: "(hola | buenos dias | buenas tardes | buenas noches | buenas | buen dia | hola buenas | hola buenos dias | hola buenas tardes)",
  // a short reason after "Perdón, me tengo que ir" in the same breath (#driving: "¡Maneje con cuidado!" fits)
  leaving_why: "[perdon] [es que | porque] (estoy manejando [ahorita] #driving | voy manejando #driving | (tengo | traigo) prisa | voy tarde | tengo otra llamada | tengo una (cita | junta) [ahorita | ahora] | ya llegó mi (taxi | camion | autobus | uber) | se me acaba la (bateria | pila) | (tocan | estan tocando) la puerta)",
};

/** Leaving early ("Perdón, me tengo que ir.", "Le llamo luego."), shared by every situation. #leaving = only a goodbye
 *  when nothing but thanks or another goodbye follows ("Me tengo que ir al aeropuerto" is not one; see nlu.ts). */
export const LEAVING_PATTERNS = [
  "#leaving [perdon] [lo siento] (me tengo que ir | tengo que irme | ya me voy | me voy | ya me tengo que ir | tengo que colgar | le tengo que colgar | te tengo que colgar | tengo que irme ya) [ya | ahorita | ahora | temprano] [@leaving_why]",
  "#leaving [perdon] (le | te) (llamo | marco | hablo) (luego | despues | mas tarde | manana | al rato)",
  "#leaving [perdon] (luego | despues | al rato) (le | te) (llamo | marco | hablo)",
];

export const GLOBAL_INTENTS: Record<string, { patterns: string[] }> = {
  g_repeat: { patterns: [
    "(perdon | mande | como | que | disculpe | perdone | como dice | como dijo | como dijiste | otra vez | de nuevo | repita | repite)",
    "[perdon] @could_you (repetir | repetirlo | repetirmelo) [lo | eso | la pregunta] [otra vez | una vez mas] #h:c_say_again",
    "[perdon] [me] lo (repite | repites | puede repetir | puedes repetir | podria repetir) [otra vez] #h:c_repeat",
    "[perdon] @could_you (decir | decirlo | decirmelo) (otra vez | de nuevo | una vez mas)",
    "[perdon] (que | como) (dijo | dijiste)",
    "[perdon] no [le | te] (escuché | oi | entendi) [bien] [lo que dijo | lo que dijiste] #h:c_catch",
    "(otra vez | una vez mas | de nuevo | repita | repite) [por favor]",
  ] },
  g_slower: { patterns: [
    "[perdon] @could_you hablar (mas despacio | mas lento | despacio | lento | mas despacito) #h:c_slower",
    "[un poco] (mas despacio | mas lento | despacio | mas despacito)",
    "(habla | hablas | habla usted) (muy | demasiado) rapido",
    "(muy | tan | demasiado) rapido", "no tan rapido",
    "[perdon] (hable | habla | hableme | hablame) (mas despacio | mas lento | despacio | mas despacito)",
  ] },
  g_dont_understand: { patterns: [
    "[perdon] no (entiendo | le entiendo | te entiendo | comprendo) #h:c_dont_understand",
    "[perdon] no (entendi | le entendi | te entendi) [la pregunta | nada | bien]",
    "no le entiendo nada", "no entiendo nada",
  ] },
  g_spell: { patterns: [
    "como se escribe [eso | esto | su nombre | la palabra] #h:c_spell",
    "@could_you (deletrear | deletrearlo | deletrearmelo)", "como se deletrea", "letra por letra",
  ] },
  g_write: { patterns: [
    "me lo (puede | puedes | podria) escribir #h:c_write",
    "@could_you (escribirlo | escribirmelo | escribir eso | escribirlo aqui)",
    "(escribalo | escribelo | escribamelo | escribemelo) [por favor]",
    "(me lo | lo) (escribe | escribes | anota | anotas)",
  ] },
  g_meaning: { patterns: [
    "que (significa | quiere decir) [eso | esto] #h:c_meaning",
    "que (significa | quiere decir) {w:any}",
    "no conozco (esa | esta) palabra",
    "que significa la palabra {w:any}",
  ] },
  g_learning: { patterns: [
    "[perdon] (estoy | todavia estoy | apenas estoy) aprendiendo [espanol] #h:c_learning",
    "[perdon] mi espanol no es [muy | tan] bueno",
    "[perdon] no hablo [muy] bien [el] espanol",
    "[perdon] (hablo | solo hablo) (poquito | un poco | un poquito | poco) [de] espanol",
    "el espanol no es mi (idioma | lengua) [materna]",
  ] },
  g_thanks: { patterns: [
    "[muchas | mil | muchisimas] gracias #h:s_thanks",
    "[muchas | mil | muchisimas] gracias por (su ayuda | tu ayuda | la ayuda | todo | ayudarme | su tiempo | tu tiempo | los consejos | la informacion | las recomendaciones) #h:s_thanks_help",
    "(se lo | te lo) agradezco [mucho]", "(muy | super | que) amable", "[muchas] gracias (a todos | a todas | equipo | chicos)",
    "(perfecto | excelente | genial | que bien | buenisimo) [muchas] gracias",
    "me (ayudó | ayudaste) mucho", "(fue | ha sido) (muy | super) amable",
  ] },
  g_bye: { patterns: [
    "(adios | hasta luego | nos vemos | hasta pronto | hasta manana | bye | chao | hasta la proxima) #h:s_bye2",
    "que (tenga | tengas) (buen dia | un buen dia | buena tarde | buenas tardes | buena noche | buen fin de semana | bonito dia) #h:s_bye",
    "que (le | te) vaya [muy] bien", "que (este | estes) [muy] bien", "que (descanse | descanses)",
    "(igualmente | usted tambien | tu tambien)",
    "(cuidese | cuidate) [mucho]",
    ...LEAVING_PATTERNS,
  ] },
  g_hello: { patterns: ["@greet #h:s_hello"] },
  g_howareyou: { patterns: [
    "(como esta | como estas | que tal | como le va | como te va | como va todo | que onda | como ha estado | como has estado) [usted | tu] [hoy]",
    "@greet (como esta | como estas | que tal) [usted | tu]",
  ] },
  g_howareyou_answer: { patterns: [
    "[estoy] (bien #h:h_good | muy bien #h:h_fine | super bien | excelente #h:h_great | todo bien | bastante bien #h:h_pretty | no me quejo #h:h_notbad | aqui andamos | pues bien | de maravilla) [gracias | muchas gracias] [(y usted | y tu | y a usted | y a ti | usted como esta | y usted como esta | y tu como estas | y usted que tal | y tu que tal)]",
    "[estoy] (bien | muy bien | excelente) gracias por preguntar",
  ] },
  g_howareyou_bad: { patterns: [
    "[estoy] (mas o menos | no muy bien | regular | cansado | cansada | un poco cansado | un poco cansada | mal | no me siento bien)",
  ] },
  g_wait: { patterns: [
    "(un momento | un segundo | un momentito | un minuto | un segundito) [por favor] #h:c_moment",
    "(dejeme | dejame | permitame | permiteme) (pensar | ver | revisar) [un momento]",
    "(espere | espera | permitame | permiteme) [un momento | un segundo]",
  ] },
  g_sorry: { patterns: ["lo siento [mucho]", "(perdon | disculpe | disculpa) (por eso | por la molestia)", "una disculpa", "ups", "me equivoqué", "fue mi error"] },
  g_dontknow: { patterns: ["no se", "no lo se", "no estoy (seguro | segura) [todavia]", "no tengo idea", "ni idea", "no se todavia", "todavia no se", "no me decido", "no he decidido [todavia]", "[ya] no (me acuerdo | recuerdo) [bien]"] },
  g_ok: { patterns: ["(entendido | ya veo | ya entendi | entiendo | perfecto | genial | que bien | bueno | muy bien | ok entonces | va pues | sale pues)",
    // "Ya sé lo que quiere decir" is understanding, not a question about a word (g_meaning)
    "(ya | si) (entiendo | se) lo que (quiere decir | quieres decir | dice | dices)"] },
};

// ---------------------------------------------------------------------------

function lastWith(c: ConvCtx, key: "spell" | "write") {
  const lines = c.conv.lastLines;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    const src = (c.conv.sit.lines[l.lineId] ?? GLOBAL_LINES[l.lineId])?.[l.variant];
    if (src?.[key]) return src[key]!;
  }
  return null;
}

export const GLOBAL_HANDLERS: Record<string, (c: ConvCtx, slots: any) => void> = {
  g_repeat(c) {
    if (c.chance(0.4)) c.say("g_repeat_intro");
    c.conv.replayLast(false);
    c.hold();
  },
  g_slower(c) {
    c.say("g_slow_intro");
    c.conv.markSlow();
    c.conv.replayLast(true);
    c.hold();
  },
  g_dont_understand(c) {
    c.say("g_dont_understand");
    c.conv.markSlow();
    c.conv.replayLast(true);
    c.conv.showMeaning();
    c.hold();
  },
  g_spell(c) {
    const w = lastWith(c, "spell");
    if (w) c.say("g_spell", { letters: w });
    else c.say("g_which_word");
    c.hold();
  },
  g_write(c) {
    const w = lastWith(c, "write") ?? lastWith(c, "spell");
    if (w) { c.say("g_write"); c.conv.addNote({ en: w }); }
    else c.say("g_nothing_to_write");
    c.hold();
  },
  g_meaning(c) {
    c.say("g_meaning");
    c.conv.showMeaning();
    c.hold();
  },
  g_learning(c) {
    c.say("g_learning");
    c.say("g_speak_slowly");
    c.conv.markSlow();
  },
  g_thanks(c) {
    c.say("g_welcome");
    if (c.conv.completed) c.hold();
  },
  g_bye(c) {
    c.say("g_bye");
    c.end();
    c.hold(); // no open question is asked again after "¡Adiós!"
  },
  g_hello(c) {
    if (!c.s.__greetedBack) { c.say("g_hello"); c.s.__greetedBack = true; }
  },
  g_howareyou(c) {
    c.say("g_howareyou_reply");
    expectHowAreYou(c);
  },
  g_howareyou_answer(c) {
    // Unprompted "Bien, gracias, ¿y usted?": answer only the question part.
    if (askedBack(c)) c.say("g_asked_back");
  },
  g_howareyou_bad(c) { c.say("g_sorry_to_hear"); },
  g_wait(c) { c.say("g_take_time"); c.hold(); },
  g_sorry(c) { c.say("g_no_worries"); },
  g_dontknow(c) {
    const st = c.conv.currentStep();
    if (st?.help) { st.help(c); c.hold(); }
    else { c.say("g_take_time"); c.hold(); }
  },
  g_ok() { /* acknowledgement: just continue */ },
};

/** "¿Y usted?" / "¿Y tú?" / "¿Usted cómo está?": the learner asked back. */
const askedBack = (c: { heard: string }) => /\b(usted|tu|ti)\b/.test((c.heard || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase());

/** After an NPC line that asks "¿Cómo está?": handle the learner's answer (and "¿Y usted?"). */
export function expectHowAreYou(c: import("../../../content/types").Ctx, then?: (c: import("../../../content/types").Ctx) => void) {
  const reply = (cc: import("../../../content/types").Ctx, bad = false) => {
    if (bad) cc.say("g_sorry_to_hear");
    else if (askedBack(cc)) cc.say("g_asked_back");
    else cc.say("g_glad");
    then?.(cc);
  };
  c.expect({
    id: "howareyou",
    optional: true,
    expects: ["g_howareyou_answer", "g_howareyou_bad"],
    hints: ["g_howareyou"],
    suggest: [{ lt: "Say how you are (and ask back)", hint: "g_howareyou" }],
    on: {
      g_howareyou_answer: (cc) => { reply(cc); },
      g_howareyou_bad: (cc) => { reply(cc, true); },
      g_ok: (cc) => { reply(cc); },
    },
    yes: (cc) => reply(cc),
  });
}

// ---------------------------------------------------------------------------

export const GLOBAL_HINTS: Record<string, HintGroup> = {
  g_clarify: {
    lt: "Ask them to repeat, slow down or explain",
    items: [
      { id: "c_say_again", s: t("Perdón, | ¿{u:puede|t:puedes} | repetir?", "Sorry, | can you | repeat?", "Sorry, could you say that again?") },
      { id: "c_repeat", s: t("¿Me | lo | {u:repite|t:repites}, | por favor?", "(To) me | it | you-repeat, | please?", "Could you repeat that, please?") },
      { id: "c_slower", s: t("¿{u:Puede|t:Puedes} | hablar | más despacio, | por favor?", "Can you | speak | more slowly, | please?", "Could you speak more slowly, please?") },
      { id: "c_catch", s: t("Perdón, | no escuché | bien.", "Sorry, | I didn't hear | well.", "Sorry, I didn't catch that.") },
      { id: "c_dont_understand", s: t("Perdón, | no entiendo.", "Sorry, | I don't understand.", "Sorry, I don't understand.") },
      { id: "c_spell", s: t("¿Cómo | se escribe?", "How | is it spelled?", "How do you spell that?") },
      { id: "c_meaning", s: t("¿Qué | significa | eso?", "What | means | that?", "What does that mean?") },
      { id: "c_write", s: t("¿Me | lo | {u:puede|t:puedes} | escribir, | por favor?", "(For) me | it | can you | write, | please?", "Could you write it down for me, please?") },
      { id: "c_learning", s: t("Estoy | aprendiendo | español.", "I'm | learning | Spanish.", "I'm learning Spanish.") },
      { id: "c_moment", s: t("Un | momento, | por favor.", "One | moment, | please.", "Just a moment, please.") },
    ],
  },
  // closings (thanks first: the guide shows the first items as model answers)
  g_social: {
    lt: "Say thank you and goodbye",
    items: [
      { id: "s_thanks", s: t("¡Muchas | gracias!", "Many | thanks!", "Thank you very much!") },
      { id: "s_thanks_help", s: t("¡Gracias | por | {u:su|t:tu} | ayuda!", "Thanks | for | your | help!", "Thanks for your help!") },
      { id: "s_bye", s: t("¡Que | {u:tenga|t:tengas} | buen día!", "(I hope) | you have | a good day!", "Have a nice day!") },
      { id: "s_bye2", s: t("¡Adiós!", "Goodbye!", "Goodbye!") },
      { id: "s_hello", s: t("¡Hola! | ¿Cómo | {u:está|t:estás}?", "Hi! | How | are you?", "Hi! How are you?") },
    ],
  },
  g_greet: {
    lt: "Say hello",
    items: [
      { id: "s_hello", s: t("¡Hola! | ¿Cómo | {u:está|t:estás}?", "Hi! | How | are you?", "Hi! How are you?") },
      { id: "s_good_morning", s: t("¡Buenos días!", "Good morning!", "Good morning!") },
      { id: "s_hello_there", s: t("¡Buenas!", "Hi!", "Hi!"), note: "A friendly hello at any time of day." },
    ],
  },
  g_yesno: {
    lt: "Answer yes or no",
    items: [
      { id: "yn_yes_please", s: t("Sí, | por favor.", "Yes, | please.", "Yes, please.") },
      { id: "yn_no_thanks", s: t("No, | gracias.", "No, | thanks.", "No, thanks.") },
      { id: "yn_sure", s: t("¡Claro, | gracias!", "Sure, | thanks!", "Sure, thanks!") },
      { id: "yn_im_good", s: t("No, | así | estoy | bien, | gracias.", "No, | like this | I'm | fine, | thanks.", "No, I'm good, thanks."), note: "A polite no: “I'm fine as I am.”" },
      { id: "yn_great", s: t("¡Sería | genial, | gracias!", "It would be | great, | thanks!", "That would be great, thanks!") },
    ],
  },
  g_howareyou: {
    lt: "Say how you are",
    items: [
      { id: "h_good", s: t("Bien, | gracias. | ¿Y | {u:usted|t:tú}?", "Good, | thanks. | And | you?", "Good, thanks. And you?") },
      { id: "h_fine", s: t("Muy | bien, | gracias. | ¿Y | {u:usted|t:tú}?", "Very | well, | thanks. | And | you?", "Very well, thanks. And you?") },
      { id: "h_pretty", s: t("Bastante | bien, | gracias.", "Pretty | well, | thanks.", "Pretty good, thanks!") },
      { id: "h_notbad", s: t("No me quejo. | ¿Y | {u:usted|t:tú}?", "I can't complain. | And | you?", "Can't complain. And you?") },
      { id: "h_great", s: t("¡Excelente, | gracias | por | preguntar!", "Excellent, | thanks | for | asking!", "Great, thanks for asking!") },
    ],
  },
};

export const GLOBAL_TIPS = {
  blunt: { key: "blunt", lt: "Understood! A little more polite: “Quisiera …, por favor” or “¿Me da …?”", better: "Quisiera …, por favor." },
};

export const GLOBAL: GlobalContent = {
  intents: GLOBAL_INTENTS,
  lines: GLOBAL_LINES,
  hints: GLOBAL_HINTS,
  tips: GLOBAL_TIPS,
  entities: [],
  handlers: GLOBAL_HANDLERS,
  macros: GLOBAL_MACROS,
};
