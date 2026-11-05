// Advanced song P30 "Can We Start Over?" → Puerto Colibrí: "¿Empezamos de nuevo?" (B2–C1). Making up with a friend.
// Diego and Natalia (both tú, as friends say in Mexico) are the friends who had the learner over for cochinita (s85).
// Two months ago, at Diego's carne asada in the patio, in front of everybody, the learner said: "Tú nunca terminas
// nada, ¡ni siquiera esa lancha tonta!" (Diego has been restoring an old wooden lancha for years.) Since then:
// silence, and pretending not to see each other at the mercado. Saturday morning, the learner knocks on the door.
// Diego is normally the warm host of s85; today he is hurt, short and dry, and warm underneath.
//
// Flow (the English edition's): door (ask to talk, or apologize at once) → apology (sincere, no "pero"; a vague
// "Lo siento" gets "¿Perdón por qué, exactamente?") → responsibility (own it — "me equivoqué", "me pasé", "no hay
// excusa" — and answer "¿Por qué no me llamaste y ya?") → Diego's turn: open ("Es la primera vez que te oigo decir
// «me equivoqué». Yo también me equivoqué…") or needs time (twist: the learner accepts — "Dime y me voy" — and Diego
// calls them back: "Oye. Espera. Ya lo pensé. Me tomó como diez segundos.") → [twist: Natalia from inside: "¡No
// dejes a tu amigo en la puerta! Ya está el café."] → making it up (a dinner, and you cook / help with the lancha /
// stay for lunch) → "¿Empezamos de nuevo?" / "¿Borrón y cuenta nueva?" → "Ya empezamos. Tú y yo." → "Pásale."
// Bad moves ("Lo siento, pero…", "Siento que te sientas así", excuses, blame, "era una broma", pushing) get an
// in-world reply and a tip, never a failure. "No fue mi intención" (the brief) gets "Tal vez no. Pero lo dijiste."
// A bare yes or no answers the question in a bad move's reply ("¿Quieres intentarlo otra vez?" – "Sí." – "Te escucho.").
// No is respected: "Hoy no puedo" to his price gets "Bueno, otro día. Pero me la debes."; a "No" gets "Respuesta
// equivocada" once (a joke between friends), and a second "No" he lets go (the price: "Con la disculpa me conformo";
// "¿Borrón y cuenta nueva o qué?": "Poco a poco, entonces."). Side questions: "¿Sigues enojado?", "¿Me perdonas?",
// "¿Qué quieres que cocine?", "¿Puedo volver mañana?".
// Endings: reconciled (complete, memory danReconciled); left after apologizing (memory danApologized); left early.
//
// Mexico, not Maple Harbor: no porch (the front door on the street), the carne asada instead of a backyard barbecue,
// the mercado instead of the farmers' market, Michi the cat (s85), "pásale", "trato hecho", "sale", "la regué",
// "me pasé", "borrón y cuenta nueva", "hacer las paces". In Spanish "Perdóname" is the warm, normal way to apologize
// (the English edition's "Forgive me" tip doesn't apply), and so is "hacer las paces" (no "make peace" tip). A bare
// "disculpa" or "ups" is for small things: a tip. Spain forms are right answers with no tip (tío, vale, echar de
// menos, os, liarla, apetecer).
// Mexican-only words in NPC lines, each with a neutral twin: carne asada (as the party: parrillada), pásale; in a hint:
// sale. Facts: nothing to research beyond usage; no prices, no times.
//
// Gender: {m:…|f:…} = the player; Diego is male, Natalia female.
//
// NEEDS: global.ts g_bye takes a bare "igualmente" / "tú también" as a goodbye: after Natalia's "¡Qué gusto verte!"
// that would end the visit (handled here in g_bye, as s85 does). global.ts g_repeat takes a bare "perdón" as "pardon?":
// here it is an apology unless asked with "?" (handled here in g_repeat). global.ts g_sorry holds "me equivoqué" and
// "fue mi error", which here are owning it (handled in g_sorry). The English edition's NEEDS stand: an "enter" event
// for Natalia, an "outro" event with the end-card line, and a shared memory so s85 could greet the learner warmly.

import type { Ctx, Segment, SituationDef, Tip } from "@/content/types";
import { t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Flags used more than once

const NADA = "nunca … nada: Spanish doubles the negative (never … anything).";
const CARNE = "Mexican: carne asada = grilled steak, and the backyard party around it (a cookout).";
const ART_GEN = "The article before a noun in general has no English word.";
const PERS_A = "a before a person who is the object: no English word.";
const COMER = "comer: here, have lunch (la comida, the big midday meal).";
const BORRON = "borrón y cuenta nueva: “a smudge and a new account”, a clean slate.";
const SUBJ = "Subjunctive after cuando / que: the verb looks ahead.";

// ---------------------------------------------------------------------------
// State helpers

type H = (c: Ctx, slots: any, seg: Segment) => void;
const NOSEG: Segment = { intent: "", slots: {}, tags: [] };

/** One learner turn can split into several pieces ("Me equivoqué. No te lo merecías."): react once per turn. The
 *  dialogue creates a fresh context object for every learner turn. */
const TURN = new WeakMap<Ctx, Set<string>>();
function once(c: Ctx, key: string): boolean {
  let set = TURN.get(c);
  if (!set) { set = new Set(); TURN.set(c, set); }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}
const mark = (c: Ctx, key: string) => { once(c, key); };
const now = (c: Ctx, key: string) => !!TURN.get(c)?.has(key);
const fold = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const heard = (c: Ctx) => fold(c.heard);

const dan = (c: Ctx, line: string) => { c.speaker("dan"); c.say(line); };
const nora = (c: Ctx, line: string) => { c.speaker("nora"); c.say(line); };
/** Say a reaction at most once per learner turn. */
const react = (c: Ctx, line: string) => { if (once(c, "say:" + line)) dan(c, line); };

/** Diego asked for time and the learner hasn't accepted it yet. */
const timeOpen = (c: Ctx) => c.s.mood === "needs_time" && !!c.s.needSaid && !c.s.timeOk;
/** Responsibility: owned it, and answered (or let go of) "¿Por qué no me llamaste?". */
const respDone = (c: Ctx) => !!c.s.ownDone && (!!c.s.whyAnswered || !!c.s.whySkipped);
const stepIs = (c: Ctx, id: string) => c.step === id;
/** "Lo siento, pero…" (an apology with a "pero" after it in the same sentence). */
const SORRY_BUT = /\b(lo siento|perdon|perdoname|disculpa|disculpame|siento|lamento)\b[^.!?;]*\bpero\b/;
/** A non-apology about the other's feelings ("Siento que te sientas así", "Perdón si te ofendí"). */
const NON_APOLOGY_YOU = /\b(te sientas|te sintieras|te sentiste|te hayas|si te|te lo hayas tomado|te lo tomaste|lo tomaste|estes|alguien se)\b/;
/** A bare "¿Perdón?" asks to repeat; "Perdón." apologizes. */
const PARDON_Q = /^\W*(perdon|disculpa|disculpe|perdone|como)\W*\?\W*$/;
/** Asking to be forgiven ("¿Me perdonas?", "Espero que me perdones"), not "Perdón" / "Perdóname". */
const FORGIVE_Q = /\bperdon(as|arias|aras|ar|arme|es)\b/;
/** A bare "Está bien" (okay): the grammar reads it like "Estamos bien" (start_over); here it is a plain yes. */
const BARE_OK = /^\W*((bueno|ok|okay|pues|si|ah|ya|vale)\W+)?(esta|ta) (bien|muy bien)(\W+(diego|carnal|amigo|amiga|hermano|compa|gracias))?\W*$/;

/** End-card lines (sent with the "outro" event; see NEEDS). */
const OUTRO = {
  reconciled: "You made up. Diego asks you in: the coffee's ready.",
  partial: "You apologized, but you haven't started over yet. Diego will wait for your call.",
  early: { m: "You left without apologizing.", f: "You left without apologizing." },
};

// ---------------------------------------------------------------------------
// Tips (English: the learner's language)

const TIPS: Record<string, Tip> = {
  sorry_but: { key: "sorry_but", lt: "Understood! But “Lo siento, pero…” cancels the apology: everything before “pero” stops counting. Apologize with no “pero”.", better: "Lo siento mucho. No tengo excusa." },
  non_apology: { key: "non_apology", lt: "Understood! But “Siento que te sientas así” or “Perdón si te ofendí” isn't an apology: it's sorry about his feelings, not about your words. Apologize for what you said.", better: "Siento mucho lo que dije." },
  excuse: { key: "excuse", lt: "Understood! That's an explanation, not an apology. A real apology doesn't look for excuses.", better: "No hay excusa para lo que dije." },
  blame: { key: "blame", lt: "Understood! But blaming him while you apologize turns it into an argument. Talk about yourself.", better: "Me equivoqué. Fue mi culpa." },
  just_joke: { key: "just_joke", lt: "Understood! But “era una broma” or “no es para tanto” makes his feelings small. Say that you hurt him.", better: "Me pasé. No te lo merecías." },
  push: { key: "push", lt: "Understood! But you can't order forgiveness. If your friend needs time, show that you respect it.", better: "Entiendo si necesitas tiempo." },
  too_light: { key: "too_light", lt: "Understood! “Ups” or a bare “disculpa” is for small things, like bumping into someone. A real apology needs more: “Perdóname” or “Lo siento mucho”.", better: "Lo siento mucho, Diego." },
  calque_new: { key: "calque_new", lt: "Understood! “Empezar sobre” is the English “start over”, word for word. In Spanish: “empezar de nuevo” or “empezar de cero”.", better: "¿Empezamos de nuevo?" },
};

// Automatic answers for the moments the sims don't script (see tools/sim-play.ts).
const AUTO: Record<string, string> = {
  door: "¿Podemos hablar?", apology: "Siento mucho lo que dije en tu carne asada.",
  responsibility: "Tenías razón, y fui demasiado orgulloso para llamarte.", turn: "Entiendo si necesitas tiempo.",
  nora: "¡Hola, Natalia!", make_up: "Déjame invitarte a cenar.", start_over: "¿Empezamos de nuevo?",
};

// ---------------------------------------------------------------------------

export const startOver: SituationDef = {
  id: "p30-start-over",
  song: "P30",
  songTitle: "Can We Start Over?",
  title: { en: "¿Empezamos de nuevo?", lt: "Can We Start Over?" },
  topic: { en: "Hacer las paces con un amigo", lt: "Making up with a friend" },
  chapter: 8,
  order: 7,
  location: "dans-house",
  npc: "dan",
  npcs: ["nora"],
  goal: "Apologize to Diego from the heart, and start your friendship over.",
  intro: "Saturday morning, at Diego and Natalia's front door. Two months ago, at Diego's carne asada, in front of everybody, you told him: “Tú nunca terminas nada, ¡ni siquiera esa lancha tonta!” — and you haven't called since. Today you finally knocked: you came to apologize. Friends say tú.",

  grammar: {
    macros: {
      // an apology word, with or without "de verdad"
      sorry: "[de verdad | en serio | neta | la verdad] (lo siento [mucho | muchisimo] | perdoname | perdon | disculpame | te pido perdon | te pido (una | mil)? disculpas? | mil disculpas | mil perdones | una disculpa) [de verdad | en serio | de corazon]",
      siento: "[de verdad] (siento | lamento) [mucho | muchisimo | de verdad | de corazon]",
      bbq: "(carne asada | carnita asada | parrillada | fiesta | reunion | comida | barbacoa | asado | cumpleanos)",
      said: "(lo que (dije | te dije) | las cosas que (dije | te dije) | todo lo que (dije | te dije) | mis palabras | esas palabras | lo que hice | como te hablé | como te traté | la forma en que te hablé | ese comentario | mi comentario | esa broma | mi broma | ese chiste | lo que pasó | como me porté | lo de la lancha | lo que dije (de | sobre) (ti | la lancha | tu lancha) | (decir | decirte | haber dicho | haberte dicho) (eso | esas cosas | lo que dije | todo eso))",
      where: "(en (la | tu | esa | aquella) @bbq | enfrente de (todos | todo el mundo | tus amigos | tu familia | la gente | tus invitados) | delante de (todos | todo el mundo | tus amigos | tu familia) | (esa | aquella) (noche | tarde | vez) | ese dia | hace dos meses)",
      lancha: "(la | tu | esa | tu tonta | esa tonta) (lancha | barca | bote | barco | lanchita)",
      silence: "(no llamarte | no haberte llamado | nunca llamarte | el silencio | desaparecer | haber desaparecido | ignorarte | evitarte | no buscarte | no haberte buscado | estos dos meses | dos meses de silencio | no hablarte | no venir antes | no haber venido antes | tardar tanto | haber tardado tanto)",
      proud: "[demasiado | muy | tan] (orgulloso | orgullosa | terco | terca | necio | necia)",
      time_obj: "(tiempo | un tiempo | un poco de tiempo | espacio | tu espacio | unos dias | mas tiempo | un rato | todo el tiempo que necesites | el tiempo que necesites)",
      treat: "(a cenar | a comer | a desayunar | una cena | la cena | una cerveza | unas cervezas | una chela | unas chelas | un cafe | unos tacos | un trago | unos tragos | una pizza | unas tortas)",
      hurt: "(lastimarte | herirte | ofenderte | humillarte | avergonzarte | insultarte | haberte lastimado | haberte herido | haberte ofendido | haberte humillado)",
      rude_adj: "[tan | muy | un | una] (grosero | grosera | cruel | injusto | injusta | mala onda | idiota | patan | tonto | tonta | pesado | pesada | mala persona | mal amigo | mala amiga)",
    },
    slots: {},
  },

  intents: {
    // --- at the door -------------------------------------------------------------------------
    // a bare name ("¡Diego!"): a catch-all, so "Hola, Diego, ¿tienes un minuto?" keeps the name as an address
    voc_unknown: { patterns: ["(diego | natalia | nata | naty)"] },
    its_me: { patterns: ["soy yo", "soy yo otra vez", "si soy yo", "hola soy yo"] },
    long_time: { patterns: [
      "[si] (ya se | lo se | ya lo se) (ha pasado | pasó) (mucho tiempo | demasiado tiempo | un buen rato | mucho) #h:yeah_know",
      "(ha pasado | pasó) (mucho | demasiado | un monton de) tiempo", "(cuanto tiempo | tanto tiempo) [sin vernos]",
      "(ya se | se) que (debí | debi) venir antes", "(ya se | se) que no me esperabas", "(ya se | se) que no (quieres | querias) (verme | hablarme | hablar conmigo)",
      "hace (mucho | mucho tiempo | dos meses | rato | un buen rato) que no (hablamos | nos vemos | nos hablamos)", "(ya se | se) que soy la ultima persona que (querias | esperabas) ver",
      "[ya se] dos meses [ya se]",
    ] },
    i_know: { patterns: ["(ya se | lo se | ya lo se) [ya lo se]", "[si] [ya] me (lo)? imagino"] },
    // "¿Sigues enojado?": "¿Tú qué crees?" before he has had his say; "No. Ya se me pasó." after it
    still_mad: { patterns: [
      "[todavia | aun] (sigues | estas) [muy | tan | todavia | aun] (enojado | molesto | sentido | dolido) [conmigo] [todavia | aun]",
      "[todavia | aun] me (odias | guardas rencor)",
    ] },
    ask_how: { patterns: [
      "como (estas | has estado | te ha ido | te va | andas | vas) [estos dias | ultimamente]",
      "como (esta | sigue) (natalia | tu esposa | la familia) #nora", "como (estan | han estado) (ustedes | tu y natalia | ustedes dos | los dos) #nora",
      "como (va | vas con | sigue) (la | tu) (lancha | barca | bote) #boat", "[y] (la | tu) lancha #boat",
      "como (esta | sigue) (michi | la gata | tu gata | la gatita) #cat", "(esta | anda) natalia [en casa | por aqui] #here",
    ] },
    can_talk: { patterns: [
      "(tienes | tiene | tienen) un (minuto | momento | segundo | minutito | momentito) #h:have_minute", "(tienes | tiene | tienen) (tiempo | un rato | un ratito | chance) [para (hablar | platicar)]",
      "(necesito | quiero | tengo que | queria) decirte algo", "(vengo | vine) en (son de paz | paz)", "no (vengo | vine) a (pelear | discutir)",
      "no quiero (pelear | discutir) [contigo]", "[nada] [solo | nada mas] (queria | quise | vine a | vengo a) (verte | saludarte | saludar)",
      "(podemos | podriamos) (hablar | platicar) [un (momento | minuto | rato)] #h:can_talk",
      "(puedo | podria) (hablar | platicar) contigo [un (momento | minuto)]",
      "(necesito | quiero | quisiera | me gustaria) (hablar | platicar) contigo [de (algo | la @bbq | lo que pasó | nosotros | lo que dije)] [es importante]",
      "(tenemos que | necesitamos | deberiamos) (hablar | platicar)",
      "(es | este es) (un mal momento | buen momento)",
      "(vine | vengo) a (hablar | platicar | verte | hablar contigo | platicar contigo)",
      "(dame | me das | me puedes dar) (una oportunidad | un minuto | cinco minutos | un momento | chance)",
      "(escuchame | dejame hablar | dejame explicarte | solo escuchame) [un momento]",
      "(puedo | podria) decirte algo", "me (escuchas | puedes escuchar) [un momento]",
    ] },
    come_in: { patterns: ["(puedo | podria) (pasar | entrar) [un momento]", "me dejas (pasar | entrar)", "(se puede | puedo) pasar"] },

    // --- the apology ----------------------------------------------------------------------------
    apologize: { patterns: [
      // announcing it ("Bueno. Sigue.")
      "te debo una disculpa #announce #h:owe_apology", "te debo (una gran disculpa | una disculpa enorme | un perdon) #announce",
      "(quiero | necesito | queria | tengo que) (disculparme | pedirte perdon | pedirte disculpas | pedirte una disculpa) [contigo] #announce #h:apologize",
      "(vine | vengo) a (disculparme | pedirte perdon | pedirte disculpas | pedirte una disculpa) [contigo] #announce #h:came_apologize",
      "estoy aqui para (disculparme | pedirte perdon) #announce", "te (quiero | queria | tengo que | vengo a | vine a) pedir (perdon | disculpas | una disculpa) #announce", "(vine | vengo) a decirte que lo siento #announce",
      // "¿Viniste a disculparte o a pelear?" – "A disculparme."
      "a (disculparme | pedirte perdon | pedirte disculpas | pedirte una disculpa) #announce",
      // naming what for (specific)
      "@siento @said [@where] #specific #h:truly_sorry",
      "@sorry por @said [@where] [@where] #specific #h:sorry_barbecue", "@sorry por decir que (tu | la) lancha (era | es) (tonta | una tonteria) #specific",
      "@sorry por (la | lo de la | lo que pasó en la | tu) @bbq #specific",
      "@sorry por (esa noche | ese dia | lo que pasó | lo de la lancha | lo del barco) #specific",
      "@sorry por (decir | decirte | haber dicho | haberte dicho) que (nunca terminas nada | no terminas nada | nunca acabas nada) [@where] #specific",
      "@sorry por (burlarme de | reirme de | insultar) @lancha #specific",
      "@sorry por @silence #specific #silence",
      "@sorry por @hurt [@where] #specific",
      "@sorry por (ser | haber sido) @rude_adj [contigo] [@where] #specific", "@sorry por portarme (mal | tan mal | fatal) [contigo] [@where] #specific",
      "@sorry por todo lo que (dije | te dije) [@where] #specific",
      "@siento @silence #specific #silence", "@siento (haberte dicho | haber dicho | decirte) (eso | esas cosas | lo que dije | todo eso) [@where] #specific", "@siento (haberte | que te haya) (lastimado | herido | ofendido | humillado) [@where] #specific",
      "(me siento | me he sentido | me senti) (fatal | muy mal | mal | terrible | horrible | pesimo) por @said [@where] #specific",
      "(me arrepiento | estoy arrepentido | estoy arrepentida) (de | por) @said [@where] #specific", "me arrepiento (de eso | de todo) #specific", "me arrepiento [mucho | muchisimo | de verdad]",
      "(estoy | me siento) (avergonzado | avergonzada) (de | por) @said [@where] #specific", "me da (verguenza | pena) @said [@where] #specific",
      // plain (vague): "¿Perdón por qué, exactamente?"
      "@sorry", "@sorry (por todo | por eso | por esto)", "(perdon | lo siento | perdoname | disculpame) (tio | tia | carnal | amigo | amiga | hermano | compa)",
      "(disculpa | disculpame)", "(estoy | me siento) (muy)? (arrepentido | arrepentida)", "(me siento | me senti) [muy] (mal | fatal | terrible) (por todo | por eso | de verdad)",
      "quiero que sepas que @sorry", "quiero que sepas que @siento @said [@where] #specific",
      "(me puedes | me podras | me podrias | puedes | podras | crees que puedas) perdonar[me] [algun dia]", "(me perdonas | me perdonarias | me vas a perdonar) [algun dia]",
      "espero que (me puedas perdonar | puedas perdonarme | me perdones) [algun dia] #h:hope_forgive",
    ] },
    // the answer to "¿Perdón por qué, exactamente?" (also on its own)
    apology_detail: { patterns: [
      "por @said [@where] [@where] #h:for_said", "por decir que (tu | la) lancha (era | es) (tonta | una tonteria)", "(de | sobre) @said [@where]",
      "por (decir | decirte | haber dicho | haberte dicho) que (nunca terminas nada | no terminas nada | nunca acabas nada) [@where] #h:for_boat",
      "por (burlarme de | reirme de | lo que dije de | lo que dije sobre) @lancha", "por (la | lo de la | lo que pasó en la) @bbq",
      "por (lo de la lancha | lo del barco | lo de tu lancha | esa noche)",
      "[y] por @silence #silence #h:for_silence", "y por dos meses de silencio #silence #h:for_silence",
      "por @hurt [@where]", "por (ser | haber sido) @rude_adj [@where]", "por portarme (mal | tan mal) [@where]",
      "por todo lo que (dije | te dije) [@where] [y por no llamarte]",
    ] },
    own_it: { patterns: [
      "me equivoqué [contigo] #h:was_wrong", "me equivoqué (al decir eso | al decirte eso | en decir eso | al decir lo que dije)", "me equivoqué y (es | fue) (mi culpa | culpa mia) #h:was_wrong", "me equivoqué (mucho | completamente | por completo | feo)",
      "(fue | es) [toda] (mi culpa | culpa mia) #h:my_fault", "(toda)? la culpa (es | fue) (mia | toda mia)", "(fue | fue todo) mi error", "yo tuve la culpa", "(yo | solo yo) tengo la culpa",
      "no tengo (excusa | justificacion | pretexto) [para (lo que dije | eso)]", "no hay (excusa | justificacion | pretexto) (para | por) (@said | eso | lo que hice) #h:no_excuse", "no hay (excusa | justificacion) [que valga]",
      "(tenias | tienes) razon [y yo no] #h:you_right", "(tenias | tienes) toda la razon", "(tenias | tienes) razon y (fui | estaba | era) @proud para (llamarte | hablarte | buscarte) #h:you_right #why #pride",
      "me pasé [de la raya | mucho | contigo] #h:out_of_line", "(fue | eso fue) (muy)? (injusto | cruel | horrible | feo | de muy mal gusto | una tonteria | una estupidez | una idiotez | una groseria | terrible) [de mi parte] [lo que dije]",
      "[ya se que | se que | reconozco que] @said (fue | estuvo) (muy)? (horrible | feo | cruel | injusto | terrible | de muy mal gusto | una tonteria | mal | fatal)", "(fue | era) un error [decir eso | decirlo | decirte eso]",
      "no te lo merecias #h:out_of_line", "no (te merecias | merecias) (eso | nada de eso | esas palabras)",
      "(no | nunca) (debí | debi) (decir | haber dicho | decirte) (eso | esas cosas | nada de eso | lo que dije | lo de la lancha | eso de la lancha) [@where]",
      "(estuve | hice) [muy] mal [contigo | en decir eso]", "estuvo [muy] mal lo que (dije | hice)",
      "no (estuvo | fue) [nada] (bien | justo) (lo que (dije | te dije | hice) | decir eso | decirte eso)", "lo que (dije | te dije | hice) no (estuvo | fue) [nada] (bien | justo)", "fui (un | una)? (pesimo | pesima | mal | mala | terrible) (amigo | amiga)",
      "tienes [todo el] derecho (de | a) estar (enojado | molesto | dolido)", "(entiendo | comprendo) que (estes | sigas) (enojado | molesto | dolido)",
      "(debí | debi) (llamarte | haberte llamado | buscarte | haberte buscado) [antes | hace mucho]", "(debí | debi) (venir | disculparme | pedirte perdon) antes",
      "deje que (mi orgullo ganara | el orgullo me ganara)", "(ya se | se) que te (lastimé | heri | ofendi)", "te (lastimé | heri | ofendi) [@where]",
      "la (regué | cagué) [feo | mucho | en grande]", "te (fallé | he fallado) [como amigo | como amiga]", "la (he liado | lié) [parda | bien]", "meti la pata [feo | hasta el fondo]", "cometi un (error | gran error | error enorme)",
      "fui (un idiota | una idiota | un tonto | una tonta | un patan | grosero | grosera | cruel | injusto | injusta | muy injusto | muy injusta) [contigo] [@where]",
      "(me porté | me comporté) (mal | fatal | como un idiota | como una idiota | muy mal | como un tonto | como una tonta) [contigo] [@where]",
      "(no fue | eso no fue) (justo | justo contigo | lo correcto | nada justo)", "no (tenia que | tenia por que | debia) (decir | decirte) (eso | esas cosas | nada de eso)", "asumo (la responsabilidad | toda la responsabilidad)",
    ] },
    why_silent: { patterns: [
      "el orgullo pesa [y lo cargué demasiado tiempo] #h:heavy_coat #pride", "lo cargué demasiado tiempo #pride",
      "[porque] (fui | estaba | era | soy) @proud [para (llamarte | hablarte | buscarte | disculparme | pedirte perdon)] #h:proud_call #pride",
      "[por] (orgullo | mi orgullo | puro orgullo | mi estupido orgullo | mi tonto orgullo) #pride",
      "[porque] (tenia | me daba) (verguenza | miedo | pena) [de]? [llamarte | verte | venir]", "(por | porque) (verguenza | miedo | pena | cobardia | orgullo)", "[porque] me dio (verguenza | miedo | pena)",
      "me ganó (el orgullo | mi orgullo) #pride", "me ganó (la pena | la verguenza | el miedo)", "no (tuve | tenia) (el valor | valor) [de llamarte | para llamarte | de venir]", "no me (atrevi | atrevia) [a llamarte | a venir | a buscarte]",
      "(queria | quise) llamarte [pero] no (sabia | supe) (que decir | como | como hacerlo | como empezar)",
      "(estaba | me sentia) (avergonzado | avergonzada | apenado | apenada | asustado | asustada | nervioso | nerviosa)",
      "no (sabia | supe) (que decir | como decirlo | como decirtelo | como decirte | como empezar | como hacerlo | que hacer | como disculparme | como pedirte perdon) #h:didnt_know",
      "(tenia miedo | me daba miedo) de que (estuvieras enojado | no me perdonaras | me odiaras | no quisieras verme | me cerraras la puerta)",
      "(estaba | estuve) esperando el (momento | dia) (perfecto | adecuado | indicado) #h:kept_waiting", "lo fui (dejando | posponiendo)", "lo deje para despues",
      "(cada dia | todos los dias) queria llamarte", "(quise | queria) llamarte (muchas veces | mil veces | todos los dias | cada dia)",
      "pensé que (estabas | seguias) (enojado | molesto | enojadisimo)", "[porque] pensé que no (querias | ibas a querer) (verme | hablarme | saber de mi | hablar conmigo)",
      "mientras mas (esperaba | tardaba) mas dificil (era | se hacia)", "agarré el (telefono | celular) (mil veces | muchas veces)", "[porque] (fui | soy | era) (un cobarde | una cobarde | muy cobarde)",
    ] },
    // "Es verdad" / "Sí, lo dije" after "Dijiste que nunca termino nada…": admitting it (only at that step)
    true_ctx: { patterns: ["(es verdad | es cierto) [(yo | si) lo dije]", "(si | es verdad) [yo] lo dije"] },
    // "No sé por qué" at "¿Por qué no me llamaste?": like "No sé" (Diego lets the why go)
    dunno_why_ctx: { patterns: ["no (se | sé) (por que | ni por que | bien por que)", "(ni yo se | ni idea) [por que]"] },

    // --- bad moves ------------------------------------------------------------------------------------
    sorry_but: { patterns: [
      "@sorry si (te ofendi | te lastimé | te molestó | te sentiste mal | te dolió | alguien se ofendió)",
      "@sorry si (lo que dije | mis palabras) te (ofendió | molestó | lastimó)",
      "(siento | lamento) que te (sientas | sintieras | hayas sentido) (asi | mal | ofendido | ofendida | herido | herida)",
      "(siento | lamento) que (te lo hayas tomado | lo tomaras | te lo tomaras) (asi | tan personal | a mal | mal)", "(siento | lamento) que estes (enojado | molesto | dolido)", "(siento | lamento) que te (hayas ofendido | hayas sentido mal | ofendieras | molestara | haya molestado | haya dolido)",
      "@sorry pero (era | fue) [solo | nada mas] (una broma | broma)", "@sorry pero [yo] (tenia razon | es la verdad | es verdad | es cierto)",
      "se cometieron errores",
    ] },
    excuse: { patterns: [
      "(estaba | andaba) (cansado | cansada | estresado | estresada | borracho | borracha | enojado | enojada | de malas | de mal humor | un poco tomado | un poco tomada | pasado de copas | muy estresado | muy cansado | muy cansada) [ese dia | esa noche]",
      "(tuve | tenia) (un mal dia | muchos problemas | muchas cosas | problemas en el trabajo | una semana dificil | una semana pesada) [ese dia | esa noche]",
      "habia tomado (mucho | demasiado | unas cervezas | unas chelas)", "(tomé | bebi) (demasiado | de mas | mucho | unas cervezas)",
      "(fue | era) (la cerveza | el alcohol | el calor | el tequila | culpa del alcohol | culpa de la cerveza)", "(tenia | tuve) mis razones",
      "(el trabajo | la vida) (estaba | ha estado) [muy] (pesado | pesada | dificil | complicado | complicada)",
      "(estaba | he estado | estuve | andaba) [muy | super] (ocupado | ocupada) [para llamarte] [con el trabajo]", "no (tuve | tenia) tiempo [de llamarte | para llamarte]", "se me olvidó [llamarte]",
    ] },
    didnt_mean: { patterns: [
      "no fue mi intencion [lastimarte | ofenderte | herirte | decir eso | hacerte sentir mal]",
      "no (lo dije | quise decirlo | quise decir eso) (en serio | asi | con mala intencion)", "no (queria | quise) (lastimarte | ofenderte | herirte | decir eso | hacerte sentir mal | humillarte)",
      "(no lo dije | no quise decirlo) [en serio]", "me salió mal", "(eso | asi) no es lo que (quise decir | queria decir)",
    ] },
    blame: { patterns: [
      "tu (empezaste | comenzaste) [todo]", "(fue | tambien fue | es) (tu culpa | culpa tuya) [tambien]",
      "(tu | tu tambien) (fuiste | estabas | eras) (grosero | injusto | necio | terco | pesado | mala onda) [tambien]",
      "tu (tambien)? (pudiste | podias | debiste) (llamarme | haberme llamado | buscarme)", "por que no me (llamaste | buscaste) tu",
      "tu tampoco me (llamaste | buscaste)", "tu nunca me (llamaste | buscaste) [tampoco]",
      "tu tambien dijiste (cosas | cosas feas)", "tu tambien me (ofendiste | lastimaste | heriste)", "(tu | tu tambien) tienes (la culpa | parte de la culpa)", "tambien es tu culpa", "los dos (tuvimos la culpa | nos equivocamos | fuimos culpables)", "tu tampoco eres perfecto", "se necesitan dos",
    ] },
    rude: { patterns: [
      "(era | fue) [solo | nada mas] (una broma | broma) [hombre | carnal | wey | guey]", "(solo | nada mas) (bromeaba | estaba bromeando | era broma)",
      "(eres | estas) (muy | demasiado)? (sensible | exagerado | dramatico | delicado)", "(estas | te estas) (exagerando | poniendo dramatico)",
      "no (es | fue) para tanto", "(superalo | ya superalo | relajate | calmate)", "no (es | fue) (gran cosa | tan grave | tan malo)",
      "(fue | eso fue) hace dos meses", "pero es (verdad | cierto)", "(tu | es que tu) nunca terminas nada [y lo sabes]", "(es | eso es) (verdad | cierto) o no", "sabes que es (verdad | cierto)",
    ] },

    // --- Diego's turn ------------------------------------------------------------------------------------
    accept_time: { patterns: [
      "(entiendo | lo entiendo | te entiendo | comprendo) [si necesitas @time_obj] #h:understand_time",
      "(entiendo | comprendo | lo entiendo) (perfectamente | totalmente | completamente)",
      "(es | me parece) (justo | normal | logico | razonable) [que necesites tiempo]",
      "(dime | solo dime | nada mas dime | tu dime) y me voy #h:say_so #leave", "si quieres que me vaya me voy #leave", "te dejo (solo | tranquilo | en paz) [por ahora] #leave",
      "te (doy | voy a dar) @time_obj", "tomate @time_obj #h:take_time", "tomate tu tiempo #h:take_time", "sin (presion | prisa | prisas) [tomate tu tiempo] #h:take_time",
      "(llamame | marcame | escribeme | mandame un mensaje) cuando (estes listo | quieras | estes preparado) #h:call_ready", "cuando (estes listo | quieras | estes preparado) (llamame | marcame | me llamas | me avisas | avisame)",
      "aqui (voy a estar | estare | estoy) [cuando estes listo]", "(puedo | voy a) esperar [lo que haga falta | lo que necesites | el tiempo que necesites]",
      "no me voy a ningun lado", "ya sabes donde encontrarme", "(lo respeto | respeto (tu decision | eso | tu tiempo))", "no hay (prisa | apuro)", "(te espero | yo te espero | aqui te espero) [@time_obj]", "no (quiero | voy a) presionarte", "no te (quiero | voy a) presionar", "no te presiono", "lo que (necesites | haga falta)",
      "(avisame | me avisas | llamame | marcame) cuando (quieras | estes listo | puedas) [hablar | platicar]", "cuando (quieras | estes listo) (hablamos | platicamos | nos vemos)", "necesitas (tiempo | espacio) [lo entiendo | te entiendo]",
    ] },
    push: { patterns: [
      "(ya | solo | nada mas) perdoname [ya]", "(tienes que | debes) perdonarme", "perdoname ya",
      "(podemos | por que no) (olvidarlo | olvidar todo | olvidarnos de todo | olvidar lo que pasó) [ya]", "(olvidemoslo | olvidalo | ya olvidalo)",
      "ya (pasaron | han pasado | son) dos meses", "(andale | anda | vamos) (perdoname | no seas asi)", "[andale] ya (pasaron | son) dos meses",
      "no seas (tan)? (necio | terco | dramatico | rencoroso | asi)", "(estas siendo | eres) (muy)? (necio | terco | infantil | ridiculo | rencoroso)",
      "ya estamos grandes para esto", "(ya hagamos | hagamos ya) las paces [de una vez]", "hagamos las paces de una vez",
      "por que (sigues | estas) [tan] (enojado | molesto) [todavia]",
    ] },
    time_q: { patterns: [
      "cuanto tiempo necesitas", "cuanto (tiempo)? (te vas a tardar | vas a tardar | te tardas)", "cuando vas a estar listo",
      "cuanto (tiempo)? (espero | tengo que esperar)", "cuando (te puedo llamar | puedo llamarte)", "cuando (puedo | debo) (volver | regresar)",
      // "¿Puedo volver mañana?", "¿Te llamo la próxima semana?": "Yo te aviso."
      "(puedo | podria) (volver | regresar | venir | pasar) [a verte] (manana | otro dia | la proxima semana | el fin de semana | en unos dias | despues | luego)",
      "(te llamo | puedo llamarte | te puedo llamar) (manana | otro dia | la proxima semana | el fin de semana | en unos dias | despues | luego)",
      "(quieres | prefieres) que (vuelva | regrese | te llame) (manana | otro dia | despues | luego | en unos dias)",
    ] },

    // --- making it up ----------------------------------------------------------------------------------
    make_up_q: { patterns: [
      "como te lo (puedo | podria) compensar #h:make_it_up", "como (puedo | podria) compensarte", "que (puedo | podria) hacer para compensarte",
      "(hay | habra) algo que (pueda | puedo) hacer [para compensarte | para arreglarlo | para arreglar esto]",
      "que (puedo | podria) hacer para (arreglarlo | arreglar esto | arreglar las cosas | remediarlo) #h:what_do", "que (puedo | podria) hacer",
      "como (puedo | podria) (arreglarlo | arreglar esto | remediarlo | arreglar las cosas)", "como (lo arreglo | lo arreglamos | arreglo esto | lo compenso | te compenso)",
      "dime (que hago | que puedo hacer | que tengo que hacer | como compensarte)", "que (tengo que | necesito) hacer [para arreglarlo | para compensarte]", "[y] que hago [ahora | entonces]",
      "(dejame | quiero) compensarte", "te lo voy a compensar [te lo prometo]", "(que | dime que) quieres que haga", "como (puedo | podria) ganarme tu perdon", "que (puedo | podria | tengo que) hacer para que me (perdones | disculpes)",
    ] },
    offer: { patterns: [
      "(dejame | deja) invitarte @treat #h:buy_dinner", "(te invito | yo te invito | quiero invitarte | me gustaria invitarte) @treat [este (sabado | viernes | domingo | fin de semana)]",
      "(la cena | la comida | las cervezas | las chelas | los tacos | el cafe | la siguiente ronda | la proxima ronda) (corre | corren | va | van) por mi cuenta", "(yo invito | invito yo | pago yo | yo pago)", "[yo] (pago | invito) (la cena | la comida | las cervezas | las chelas | los tacos | todo)",
      "(te | les) (cocino | hago | preparo) (la cena | de cenar | algo | una cena) [a ti y a natalia | a los dos]", "yo (cocino | les cocino | te cocino) [para (ti | ustedes | los dos | ti y natalia)]",
      "te (ayudo | voy a ayudar) (con | a terminar) @lancha #h:help_boat", "(dejame | puedo | quiero | me gustaria) ayudarte (con | a terminar) @lancha",
      "(podemos | podriamos) terminar @lancha [juntos]", "(yo)? (traigo | llevo | compro) (la carne | el postre | las cervezas | las chelas | el vino | un pastel | las tortillas)",
      "(voy a ir | ire) a tu (proxima)? (carne asada | fiesta | cumpleanos)", "(te puedo | te podria) (invitar | llevar) (a cenar | a pescar | a comer | a tomar algo)",
      "(te apetece | os apetece) (una cerveza | un cafe | cenar | ir a cenar | una cena)", "que tal (una cena | unos tacos | unas chelas | una cerveza) (por mi cuenta | yo invito)",
      "una cena en mi casa [este (sabado | viernes | fin de semana)]",
      "(que te parece si | y si | que tal si) (te invito @treat | te ayudo con @lancha | cenamos | vamos a cenar | te cocino | terminamos @lancha)",
      "(vamos | vamonos) (por | a tomar) (unos tacos | unas chelas | una cerveza | unas cervezas | un cafe | algo)",
    ] },
    // "¿Y ahora qué?" – "Una cena, yo invito." (a bare offer, only at that step)
    offer_ctx: { patterns: ["(una cena | unas chelas | unas cervezas | unos tacos | una cerveza | un cafe | una comida) [yo invito | por mi cuenta | en mi casa]"] },
    // accepting Diego's price ("Una cena. Con eso me conformo."): only while it is asked
    deal_ctx: { patterns: [
      "trato hecho #h:deal_ok", "(es | hecho) un trato", "(sale | va | va que va | orale) #h:you_got_it",
      "(me parece | suena) (justo | bien | perfecto | muy bien | genial | buenisimo)", "(tu | tu dime | dime tu | dime) (cuando | el dia | que dia) #h:name_day",
      "(el | este | el proximo) (lunes | martes | miercoles | jueves | viernes | sabado | domingo | fin de semana) [entonces] [en mi casa]", "ahi (estaré | voy a estar)",
      "cuenta conmigo", "(es | me parece) justo", "acepto", "hecho", "(hago | haré) lo que (quieras | tu digas)", "(que dia | cuando) [te parece | quieres | entonces]",
      // "¿Y ahora qué?" – "Lo que tú quieras." / "Tú dime.": Diego names his price (at "¿Trato hecho?" they agree)
      "(lo que | como) [tu] (quieras | digas | mandes | decidas | necesites)", "lo que haga falta", "(tu dime | dime tu | tu decides | tu mandas)",
      "cuando (empezamos | comenzamos | le entramos | nos vemos)",
    ] },
    // "Podrías empezar por quedarte a comer." – "Hoy no puedo.": another day (only while his price is asked)
    cant_now_ctx: { patterns: [
      "no puedo", "(hoy | ahorita | ahora) no puedo [quedarme | ayudarte]", "no puedo (hoy | ahorita | ahora | esta semana | este fin de semana | el sabado | quedarme)",
      "[hoy | ahorita | ahora] no puedo [quedarme | ayudarte] [hoy] tengo (que trabajar | que irme | cosas que hacer | un compromiso | otro compromiso)",
      "[mejor] otro dia [si | si quieres | si puedo]", "(que tal | lo dejamos para | puede ser) otro dia", "hoy no puedo pero otro dia si",
      "(el | este | el proximo) (lunes | martes | miercoles | jueves | viernes | sabado | domingo | fin de semana) no puedo",
    ] },
    // "Y cocinas tú." – "¿Qué quieres que cocine?": "Sorpréndeme."
    what_cook: { patterns: [
      "que (quieres | te gustaria | se te antoja | prefieres) que (cocine | prepare | te cocine | te prepare) [de cenar]",
      "que (te | les) (cocino | preparo) [de cenar]", "que (cocino | preparo) [de cenar]", "que (quieres | te gustaria | se te antoja) (cenar | de cenar)",
    ] },
    cant_cook: { patterns: [
      "[pero] (yo)? no se cocinar #h:cant_cook", "[pero] (yo)? no puedo cocinar", "[pero] (cocino | soy) (fatal | muy mal | pesimo | horrible | malisimo)",
      "soy (un | una)? (pesimo | pesima | malisimo | malisima | terrible) (cocinero | cocinera)", "(natalia | todos) (sabe | saben) que no se cocinar",
      "(se me quema | quemo) (todo | hasta el agua)", "no se ni hervir agua", "ni (se | sé) cocinar",
      // the lancha's version: "Pero no sé nada de lanchas."
      "[pero] (yo)? no se (nada)? de (lanchas | barcos | botes | carpinteria) #boat", "[pero] (yo)? no se (arreglar | reparar) (lanchas | barcos | botes) #boat",
    ] },
    promise: { patterns: [
      "no (va a volver a pasar | se va a repetir | volvera a pasar) [te lo prometo] #h:wont_happen", "(nunca | jamas | nunca mas) (va a volver a pasar | se va a repetir | volvera a pasar | va a pasar | pasara)",
      "te (lo)? prometo que (no (va a volver a pasar | se va a repetir | vuelve a pasar) | voy a (llamarte | estar ahi | cambiar) | va a ser diferente)", "te prometo que te voy a (llamar | buscar | visitar) [mas | mas seguido | mas a menudo]",
      "hechos no palabras [ya veras] #h:words_cheap", "ya (veras | lo veras)",
      "(te voy a | voy a) (llamar | buscar | visitar | ver) (mas seguido | mas a menudo | mas) [te lo prometo] #h:call_more", "te (llamo | llamaré) mas (seguido | a menudo) [te lo prometo]",
      "(voy a | te prometo que voy a) estar (ahi | contigo | presente) [para (tu cumpleanos | las carnes asadas | ti)] [de ahora en adelante]",
      "(nunca | jamas) (voy a volver a | vuelvo a) (decir | hacer) (eso | algo asi)", "nunca (mas voy a | volveré a) desaparecer",
      "voy a (ser | hacerlo) mejor", "voy a ser (un mejor amigo | una mejor amiga)", "te lo (voy a demostrar | demostraré)",
      "te lo prometo", "lo prometo", "(tienes | te doy) mi palabra", "de ahora en adelante (te voy a llamar | voy a estar ahi) [mas]",
    ] },

    // --- starting over ---------------------------------------------------------------------------------
    // "¿Algo más que quieras decir?" – "Nada, gracias." (only then)
    nothing_else_ctx: { patterns: ["(nada | nada mas | no nada | eso es todo | es todo | creo que es todo | creo que eso es todo) [de verdad | por ahora]"] },
    start_over: { patterns: [
      "(empezamos | podemos empezar | empecemos | comenzamos | podemos comenzar | podriamos empezar) de (nuevo | cero) #h:start_over",
      "(empezamos | podemos empezar) de nuevo (tu y yo | los dos) #h:start_over_me_you",
      "(podemos | podriamos) (volver a empezar | empezar otra vez | intentarlo otra vez | intentarlo de nuevo) [tu y yo]", "(volvemos | podemos volver) a empezar",
      "(podemos | podriamos) volver a ser amigos #h:friends_again #friends", "(seguimos | todavia somos | aun somos) amigos #friends", "(seguimos siendo | volvemos a ser) amigos #friends",
      "amigos [otra vez | de nuevo] #friends", "(paz | hacemos paz)", "(todo bien | estamos bien) (entre nosotros | entre tu y yo)",
      "(estamos | ya estamos) bien [ahora]", "borron y cuenta nueva #h:put_behind", "(hacemos | hagamos | podemos hacer) borron y cuenta nueva",
      "(podemos | podriamos) (dejar esto atras | dejarlo atras | dejar todo atras | pasar la pagina | dar vuelta a la pagina | olvidar el pasado)",
      "(hacemos | hagamos | podemos hacer) las paces", "sin rencores",
      "(quiero | me gustaria | me encantaria) (empezar de nuevo | que empecemos de nuevo | recuperar a mi amigo | recuperar nuestra amistad | que volvamos a ser amigos)",
      "(empecemos | comencemos) (otra vez | de cero) [tu y yo]", "(y si | que tal si) (empezamos | volvemos a empezar | comenzamos) [de nuevo | otra vez | de cero] [tu y yo]", "(podemos | podriamos) (reconciliarnos | arreglarnos)",
      "(podemos | empezamos | podriamos) empezar (sobre | encima) #tip:calque_new", "(empezamos | podemos empezar) (sobre | desde nuevo | de lo nuevo) #tip:calque_new",
    ] },
    missed_you: { patterns: [
      "[yo tambien] te (extrané | he extranado | extrano) [mucho | muchisimo | un monton] #h:missed_you",
      "(los | os) (extrané | he extranado | extrano) [mucho] [a los dos] #h:nora_missed",
      "(extrané | extrano) (esto | estar con ustedes | nuestras platicas | platicar contigo | a mi amigo | a mi mejor amigo | nuestra amistad)",
      "(te | los | os) (eché | he echado | echo) de menos [mucho]", "(te | los) quiero [mucho] [carnal | amigo | amiga | hermano]", "me (hiciste | hicieron) [mucha] falta",
    ] },
    // "¡Gracias, tío!" (Spain), "Gracias, carnal" (Mexico): a plain thanks
    thanks_mate: { patterns: ["(gracias | muchas gracias | mil gracias) (tio | tia | carnal | hermano | compa | amigo | amiga)"] },
    thanks_hearing: { patterns: [
      "gracias por escucharme #h:heard_out",
      "gracias por (oirme | tu tiempo | hablar conmigo | darme una oportunidad | abrirme la puerta | dejarme hablar | dejarme explicar | entenderme | perdonarme | la oportunidad | escucharme)",
      "gracias por no (cerrarme | azotarme) la puerta [en la cara] #h:thanks_door", "gracias por (dejarme pasar | no correrme | no echarme)",
      "(te agradezco | agradezco) que me (escuches | hayas escuchado)",
    ] },
    hi_nora: { patterns: [
      "(hola | buenos dias | que tal) natalia [que gusto verte] #h:hi_nora",
      "(que gusto | que alegria | que bueno) verte [tambien | otra vez | de nuevo] [natalia]", "(me da gusto | me alegra) verte [tambien] [natalia]",
    ] },
  },

  lines: {
    // --- the door ---------------------------------------------------------------------------------
    door_open: [
      t("Vaya, | vaya. | Mira | quién | vino.", "Well, | well. | Look | who | came.", "Well, well. Look who's here."),
      t("¿Dos | meses, | y | ahora | vienes?", "Two | months, | and | now | you-come?", "Two months, and now you show up?"),
      t("Ah. | Eres | tú. | Cuánto tiempo.", "Oh. | It's | you. | Long time.", "Oh. It's you. It's been a while."),
    ],
    door_cold: [t("Hola.", "Hi.", "Hi."), t("Qué tal.", "Hey.", "Hey.")],
    door_what: [
      t("¿Y | qué | se te ofrece?", "And | what | do-you-need?", "So what can I do for you?"),
      t("¿Qué | te | trae | por aquí?", "What | you | brings | around here?", "What brings you here?"),
    ],
    long_time_react: [
      t("Dos | meses. | En | un | pueblo | de | este | tamaño.", "Two | months. | In | a | town | of | this | size.", "Two months. In a town this size."),
    ],
    market_joke: [
      t("¿Sabes | lo | difícil | que | es | esquivar | a | alguien | en | el | mercado?",
        "Do-you-know | how | hard | — | it-is | to-avoid | — | someone | at | the | market?",
        "Do you know how hard it is to avoid someone at the market?",
        { flags: { 1: "lo + adjective + que: how (hard) it is.", 3: "que: part of lo … que; English has no word for it.", 6: PERS_A } }),
    ],
    how_been: [t("Bien. | Ocupado. | Ya sabes: | yo | y | esa | lancha.", "Fine. | Busy. | You know: | me | and | that | boat.", "Fine. Busy. You know me and that boat.")],
    how_nora: [
      t("Está | bien. | Pregunta | mucho | por | ti.", "She's | fine. | She-asks | a lot | about | you.", "She's fine. She asks about you a lot.",
        { flags: { 4: "preguntar por alguien: ask about someone." } }),
    ],
    how_boat: [t("¿La | lancha? | Ahí | va, | despacio.", "The | boat? | There | it-goes, | slowly.", "The boat? Getting there. Slowly.",
      { flags: { 2: "ahí va: it's coming along." } })],
    how_here: [t("Sí, | está | adentro.", "Yeah, | she's | inside.", "Yeah, she's inside.")],
    how_cat: [t("¿Michi? | Gorda | y | feliz.", "Michi? | Fat | and | happy.", "Michi? Fat and happy.")],
    porch: [t("Empecemos | aquí, | en | la | puerta.", "Let's-start | here, | at | the | door.", "Let's start out here, at the door.")],
    listening: [
      t("Bueno. | Te | escucho.", "Okay. | (To) you | I-listen.", "Okay. I'm listening."),
      t("Adelante. | Te | escucho.", "Go ahead. | (To) you | I-listen.", "Go ahead. I'm listening."),
      t("Está bien. | Di | lo que | viniste | a | decir.", "Fine. | Say | what | you-came | to | say.", "Fine. Say what you came to say."),
    ],

    // --- the apology --------------------------------------------------------------------------------
    door_apology: [
      t("A ver. | Sigue.", "Let's see. | Go on.", "Okay. Go on."),
      t("Bueno. | Algo | es | algo.", "Well. | Something | is | something.", "Well. That's a start."),
    ],
    sorry_for_what: [
      t("¿Perdón | por | qué, | exactamente?", "Sorry | for | what, | exactly?", "Sorry for what, exactly?"),
      t("Vas | a | tener | que | ser | más | {m:específico|f:específica}.", "You're-going | to | have | to | be | more | specific.", "You'll have to be a little more specific."),
    ],
    sorry_accept_vague: [t("Bueno, | bueno. | Ya | te | oí.", "Okay, | okay. | Already | you | I-heard.", "Okay, okay. I hear you.",
      { flags: { 2: "ya: here “all right” (I got it)." } })],
    sorry_but_react: [
      t("Y | ahí | está: | el | “pero”.", "And | there | it-is: | the | “but.”", "And there it is: the “but.”"),
      t("Todo | lo que | dices | antes | del | “pero” | no cuenta.", "Everything | that | you-say | before | the | “but” | doesn't count.", "Everything before the “but” doesn't count."),
    ],
    // "Se cometieron errores." (no "pero", and no apology either)
    non_apology_react: [t("Eso | no es | una | disculpa, | la verdad.", "That | isn't | an | apology, | really.", "That's not really an apology.")],
    // "Siento que te sientas así." / "Perdón si te ofendí.": about Diego's feelings
    non_apology_you: [
      t("¿O sea | que | ahora | es | mi | culpa?", "So | — | now | it's | my | fault?", "So now it's my fault?", { flags: { 1: "o sea que: so (you mean); que has no English word." } }),
      t("¿Entonces | el | problema | son | mis | sentimientos?", "So | the | problem | are | my | feelings?", "So the problem is my feelings?"),
    ],
    excuse_react: [t("Eso | es | una | explicación, | no | una | disculpa.", "That | is | an | explanation, | not | an | apology.", "That's an explanation, not an apology.")],
    didnt_mean_react: [t("Tal vez | no. | Pero | lo | dijiste.", "Maybe | not. | But | it | you-said.", "Maybe not. But you said it.")],
    blame_react: [t("¿Viniste | a | disculparte | o | a | pelear?", "Did-you-come | to | apologize | or | to | fight?", "Did you come here to apologize or to argue?")],
    blame_late: [t("Oye. | No empieces | otra vez | con | eso.", "Hey. | Don't start | again | with | that.", "Hey. Don't start that again.")],
    rude_react: [t("Uf. | Bueno. | ¿Quieres | intentarlo | otra vez?", "Wow. | Okay. | Do-you-want | to-try-it | again?", "Wow. Okay. Want to try that again?")],
    nudge_apology: [
      t("No viniste | hasta | aquí | a | hablar | del | clima.", "You didn't come | all the way | here | to | talk | about the | weather.",
        "You didn't come all the way here to talk about the weather."),
    ],

    // --- responsibility -------------------------------------------------------------------------------
    dan_hurt: [
      t("Dijiste | que | nunca | termino | nada. | Enfrente de | todos. | En | mi | propia | carne asada.",
        "You-said | that | never | I-finish | anything. | In front of | everybody. | At | my | own | cookout.",
        "You said I never finish anything. In front of everybody. At my own cookout.",
        { flags: { 4: NADA, 10: CARNE },
          neutral: t("Dijiste | que | nunca | termino | nada. | Enfrente de | todos. | En | mi | propia | parrillada.",
            "You-said | that | never | I-finish | anything. | In front of | everybody. | At | my | own | cookout.",
            "You said I never finish anything. In front of everybody. At my own cookout.", { flags: { 4: NADA } }) }),
    ],
    dan_quote: [
      t("Tus | palabras: | “Ni siquiera | esa | lancha | tonta.”", "Your | words: | “Not even | that | boat | stupid.”", "Your words: “Not even that stupid boat.”"),
    ],
    that_hurt: [t("Eso | me | dolió | mucho.", "That | (to) me | it-hurt | a lot.", "That really hurt.")],
    ask_why_silent: [
      t("Y | luego, | dos | meses | de | nada. | ¿Por qué | no me llamaste | y ya?",
        "And | then, | two | months | of | nothing. | Why | didn't you call me | and that's it?",
        "And then two months of nothing. Why didn't you just call?", { flags: { 8: "y ya: “and that's it” = just (do it)." } }),
      t("Dos | meses. | ¿Por qué | el | silencio?", "Two | months. | Why | the | silence?", "Two months. Why the silence?"),
    ],
    why_again: [
      t("Está bien. | Pero | ¿por qué | no me llamaste?", "Okay. | But | why | didn't you call me?", "Okay. But why didn't you call?"),
      t("Ajá. | ¿Y | el | silencio?", "Uh-huh. | And | the | silence?", "Mm-hm. And the silence?"),
    ],
    own_nudge: [t("¿Y | lo que | dijiste | en | la | fiesta?", "And | what | you-said | at | the | party?", "And what you said at the party?")],
    heard_you: [
      t("Ya | te | oí.", "Already | you | I-heard.", "I heard you."),
      t("Sí. | Ya | me lo | dijiste.", "Yeah. | Already | it to me | you-said.", "Yeah. You said that."),
    ],
    // "¿Me perdonas?" once Diego has had his say
    forgiven: [t("Ya | te | perdoné.", "Already | you | I-forgave.", "I already forgave you.")],
    // "¿Sigues enojado?": before Diego has had his say, and after it
    mad_q: [t("¿Tú | qué | crees?", "You | what | you-think?", "What do you think?", { flags: { 0: "tú before the question word: what do YOU think?" } })],
    not_mad: [t("No. | Ya | se me pasó.", "No. | Already | it's-passed (for me).", "No. I'm over it.", { flags: { 2: "pasársele algo a alguien: get over it (anger, a cold)." } })],
    pride_coat: [t("El | orgullo | pesa, | ¿verdad?", "— | Pride | weighs, | right?", "Pride's heavy, huh?", { flags: { 0: ART_GEN } })],
    know_that: [t("Sí. | Algo | sé | de | eso.", "Yeah. | Something | I-know | about | that.", "Yeah. I know a thing or two about that.")],

    // --- Diego's turn ---------------------------------------------------------------------------------
    dan_first_time: [
      t("¿Sabes? | Es | la | primera | vez | que | te | oigo | decir | “me equivoqué”.",
        "You-know? | It's | the | first | time | that | you | I-hear | say | “I was wrong.”",
        "You know, that's the first time I've heard you say “I was wrong.”"),
    ],
    dan_thats_new: [
      t("Vaya. | Una | disculpa. | Eso | es | nuevo.", "Huh. | An | apology. | That | is | new.", "Huh. An apology. That's new."),
      t("Vaya. | Lo | dices | en serio.", "Huh. | It | you-say | seriously.", "Huh. You really mean it."),
    ],
    dan_wrong_too: [
      t("Yo | también | me equivoqué. | Fui | demasiado | orgulloso | para | levantar | el | teléfono.", "I | too | was wrong. | I-was | too | proud | to | pick up | the | phone.",
        "I was wrong too. Too proud to pick up the phone."),
      t("Yo | tampoco | fui | perfecto. | Nunca | te | llamé.", "I | not … either | was | perfect. | Never | you | I-called.", "I wasn't perfect either. I never called you.",
        { flags: { 1: "tampoco: “not … either”; the negation is inside it." } }),
    ],
    need_time: [
      t("Te | oigo. | Pero | necesito | tiempo | para | pensarlo.", "You | I-hear. | But | I-need | time | to | think it over.", "I hear you. But I need some time to think."),
      t("Es | mucho. | Necesito | tiempo.", "It's | a lot. | I-need | time.", "This is a lot. I need some time."),
    ],
    push_react: [t("No me presiones, | ¿sí? | Hoy | no.", "Don't push me, | okay? | Today | not.", "Don't push me, okay? Not today.")],
    push_close: [t("Mejor | hablamos | otro | día, | ¿sí?", "Better | we-talk | another | day, | okay?", "Let's talk another time, okay?")],
    just_time: [t("Solo | dame | un | tiempo.", "Just | give me | a | while.", "Just give me some time.")],
    time_q_react: [t("Yo | te | aviso.", "I | (to) you | I'll-let-know.", "I'll let you know.")],
    time_ok: [t("Gracias. | Te lo | agradezco.", "Thanks. | (For) it, you | I-thank.", "Thanks. I appreciate that.")],
    wait_twist: [t("Oye. | Espera.", "Hey. | Wait.", "Hey. Wait.")],
    wait_twist2: [
      t("Ya | lo | pensé. | Me | tomó | como | diez | segundos.", "Already | it | I-thought-over. | (To) me | it-took | about | ten | seconds.",
        "I thought about it. Took me about ten seconds."),
    ],

    // --- Natalia (twist) ---------------------------------------------------------------------------------
    nora_hall: [t("¡Ay! | ¡Mira | quién | por fin | apareció!", "Oh! | Look | who | finally | showed up!", "Oh! Look who finally showed up!")],
    nora_coffee: [
      t("¡Diego! | ¡No dejes | a | tu | {m:amigo|f:amiga} | en | la | puerta! | Ya | está | el | café.",
        "Diego! | Don't leave | — | your | friend | at | the | door! | Already | it's-ready | the | coffee.",
        "Diego! Don't keep your friend standing at the door! The coffee's ready.",
        { flags: { 2: PERS_A, 9: "ya está: it's done, it's ready." } }),
    ],
    nora_hi: [
      t("¡Ay, | qué | gusto | verte!", "Oh, | what | joy | to see you!", "Oh, it's so good to see you!"),
      t("¡Hola! | Te | extrañamos | mucho.", "Hi! | You | we-missed | a lot.", "Hi! We missed you so much."),
    ],
    dan_nora_aside: [
      t("Llevaba | dos | meses | esperando | decir | eso.", "She'd-been | two | months | waiting | to say | that.", "She's been waiting two months to say that.",
        { flags: { 0: "llevar + a time + -ndo: have been doing something that long." } }),
    ],

    // --- making it up ---------------------------------------------------------------------------------
    so_what_now: [
      t("A ver. | ¿Y | ahora | qué?", "Let's see. | And | now | what?", "So. What now?"),
      t("Bueno. | ¿Y | ahora | qué | sigue?", "Okay. | And | now | what | comes-next?", "Okay. So what happens now?"),
    ],
    i_do: [t("Pues | yo | sí.", "Well, | I | do.", "Well, I do.", { flags: { 2: "sí: “yes” here stands for the verb (I do know)." } })],
    make_up_dinner: [t("Una | cena. | Con | eso | me conformo.", "A | dinner. | With | that | I'll-settle.", "Dinner. That'll do.")],
    make_up_more: [t("Y | cocinas | tú.", "And | cook | you.", "And you're cooking.", { flags: { 2: "tú after the verb: YOU (the stress is on who)." } })],
    make_up_boat: [
      t("Ayúdame | a | terminar | la | lancha. | Ya que | yo | nunca | termino | nada.", "Help me | to | finish | the | boat. | Since | I | never | finish | anything.",
        "Help me finish the boat. Since I never finish anything.", { flags: { 9: NADA } }),
    ],
    make_up_stay: [
      t("Podrías | empezar | por | quedarte | a | comer.", "You-could | start | by | staying | to | eat.", "You could start by staying for lunch.", { flags: { 5: COMER } }),
    ],
    deal: [t("¡Hecho!", "Done!", "Deal."), t("Bueno. | Trato hecho.", "Good. | Deal.", "Good. It's a deal.")],
    deal_q: [t("¿Y? | ¿Trato hecho?", "So? | Deal?", "So? Deal?")],
    wrong_answer: [t("Respuesta | equivocada. | Inténtalo | otra vez.", "Answer | wrong. | Try it | again.", "Wrong answer. Try again.")],
    cant_cook_react: [t("Ya | lo | sé. | Ese | es | el | castigo.", "Already | it | I-know. | That | is | the | punishment.", "I know. That's the punishment.")],
    // "¿Qué quieres que cocine?"
    surprise_me: [t("Sorpréndeme.", "Surprise me.", "Surprise me.")],
    // "Hoy no puedo." at his price: another day
    deal_later: [
      t("Bueno, | otro | día. | Pero | me la | debes.", "Okay, | another | day. | But | (it to) me | you-owe.", "Okay, another day. But you owe me one.",
        { flags: { 4: "me la debes: you owe me one (la: the favor, left unsaid)." } }),
    ],
    // a second "No" to his price: he lets it go
    deal_let_go: [
      t("Bueno, | ya. | Con | la | disculpa | me conformo.", "Okay, | fine. | With | the | apology | I'll-settle.", "Okay, fine. The apology's enough for me.",
        { flags: { 1: "ya: here “enough” (I give up)." } }),
    ],
    offer_react: [
      t("¡Así se habla!", "Now you're talking!", "Now you're talking."),
      t("Trato hecho. | Pero | te | voy | a | tomar | la | palabra.", "Deal. | But | (from) you | I'm-going | to | take | the | word.", "Deal. But I'm holding you to it.",
        { flags: { 5: "tomarle la palabra a alguien: hold someone to their word." } }),
    ],
    promise_react: [t("Eso | dicen | todos. | Pero | bueno, | ya veremos.", "That | they-say | everyone. | But | okay, | we'll see.", "That's what they all say. But okay, we'll see.")],
    start_over_early: [t("Tal vez. | Pero | primero | me | debes | una | cena.", "Maybe. | But | first | (to) me | you-owe | a | dinner.", "Maybe. But first you owe me a dinner.")],
    too_soon: [t("Uy. | Vamos por partes.", "Whoa. | One thing at a time.", "Whoa. One thing at a time.")],
    missed_early: [t("Pues | qué | forma | de | demostrarlo.", "Well, | what | way | of | showing it.", "Funny way of showing it.")],
    not_yet_heard: [t("Todavía | no he oído | nada.", "Still | I haven't heard | anything.", "I haven't heard anything yet.")],

    // --- starting over ---------------------------------------------------------------------------------
    // "¿Algo más que quieras decir?" – "Sí." (not the cold "Di lo que viniste a decir" of the door)
    tell_me: [t("A ver, | dime.", "Let's see, | tell me.", "Okay, tell me.")],
    anything_else: [t("¿Algo | más | que | quieras | decir?", "Anything | else | that | you-want | to say?", "Anything else you want to say?", { flags: { 3: SUBJ } })],
    start_over_yes: [
      t("Ya | empezamos. | Tú | y | yo.", "Already | we-started. | You | and | me.", "We just did. You and me."),
      t("Ya | empezamos, | hace | un | minuto.", "Already | we-started, | ago | a | minute.", "We already did, a minute ago.", { flags: { 2: "hace + a time: … ago." } }),
    ],
    // a yes to "¿Borrón y cuenta nueva o qué?"
    start_over_ok: [t("Pues | ya | está. | Tú | y | yo.", "Well | already | it-is. | You | and | me.", "Well, that's that. You and me.", { flags: { 1: "ya está: that's it, it's done." } })],
    friends_react: [
      t("Nunca | dejamos | de | serlo. | Solo | dejamos | de | hablarnos.", "Never | we-stopped | — | being it. | Just | we-stopped | — | talking to each other.",
        "We never stopped. We just stopped talking.", { flags: { 2: "dejar de + a verb: stop (doing); de has no English word.", 6: "dejar de + a verb: stop (doing); de has no English word." } }),
    ],
    dan_offers_start: [t("Entonces, | ¿borrón y cuenta nueva | o | qué?", "So, | clean slate | or | what?", "So. Are we starting over or what?", { flags: { 1: BORRON } })],
    // a second "No" to "¿Borrón y cuenta nueva o qué?"
    slow_start: [t("Está bien. | Poco a poco, | entonces.", "Okay. | Little by little, | then.", "Okay. One step at a time, then.")],
    me_too: [
      t("Sí. | Yo | también.", "Yeah. | Me | too.", "Yeah. Me too."),
      t("Yo | también | te | extrañé, | {m:tonto|f:tonta}.", "I | too | you | I-missed, | dummy.", "I missed you too, you idiot."),
    ],
    anytime_wait: [
      t("Cuando quieras. | Solo | no me hagas | esperar | dos | meses | la | próxima | vez.", "Anytime. | Just | don't make me | wait | two | months | — | next | time.",
        "Anytime. Just don't make me wait two months next time.", { flags: { 6: "The article before próxima vez has no English word." } }),
    ],
    hush: [t("¡Ay, | ya | cállate! | Entra.", "Oh, | already | shut up! | Come in.", "Oh, hush. Come inside.", { flags: { 1: "ya: here “enough”, said with a smile." } })],

    // --- the endings ---------------------------------------------------------------------------------
    come_home: [
      t("Pásale. | Ya | está | el | café.", "Come in. | Already | it's-ready | the | coffee.", "Come on in. The coffee's ready.",
        { flags: { 0: "Mexican: pásale = come in." }, neutral: t("Pasa. | Ya | está | el | café.", "Come in. | Already | it's-ready | the | coffee.", "Come on in. The coffee's ready.") }),
    ],
    // after Natalia's "Ya está el café": not the coffee again
    come_home_michi: [t("Pasa. | Michi | también | te | extrañó.", "Come in. | Michi | too | you | missed.", "Come on in. Michi missed you too.")],
    talk_too_much: [t("Siempre | hablas | demasiado.", "Always | you-talk | too much.", "You always did talk too much.")],
    boat_final: [
      t("Ah, | ¿y | la | lancha? | Todavía | sin | terminar. | Ni | una | palabra.", "Oh, | and | the | boat? | Still | without | finishing. | Not | one | word.",
        "Oh, and the boat? Still not finished. Not one word."),
    ],
    leave_partial: [t("Bueno. | Gracias | por | venir.", "Okay. | Thanks | for | coming.", "Okay. Thanks for coming by.")],
    call_me: [t("Llámame | un día de estos. | En serio.", "Call me | one of these days. | Seriously.", "Call me sometime. I mean it.")],
    leave_early: [t("Bueno. | Nos vemos, | supongo.", "Okay. | See you, | I-guess.", "Okay. See you around, I guess.")],
    ack: [t("Mm.", "Mm.", "Mm."), t("Bueno.", "Okay.", "Okay.")],
  },

  hints: {
    talk: {
      lt: "Ask to talk",
      items: [
        { id: "yeah_know", s: t("Sí, | ya | sé. | Ha pasado | mucho | tiempo.", "Yes, | already | I-know. | It's been | a long | time.", "Yeah, I know. It's been a long time.") },
        { id: "have_minute", s: t("¿Tienes | un | minuto?", "Do-you-have | a | minute?", "Do you have a minute?") },
        { id: "can_talk", s: t("¿Podemos | hablar?", "Can-we | talk?", "Can we talk?") },
        { id: "came_apologize", s: t("Vine | a | disculparme.", "I-came | to | apologize.", "I came to apologize.") },
      ],
    },
    apology: {
      lt: "Apologize from the heart, with no “pero”",
      items: [
        { id: "owe_apology", s: t("Diego, | te | debo | una | disculpa.", "Diego, | (to) you | I-owe | an | apology.", "Diego, I owe you an apology.") },
        { id: "truly_sorry", s: t("Siento | mucho | lo que | dije.", "I-regret | a lot | what | I-said.", "I'm truly sorry for what I said."),
          note: "Sentir + what you did: a sincere apology." },
        { id: "sorry_barbecue", s: t("Perdóname | por | lo que | dije | en | tu | carne asada.", "Forgive me | for | what | I-said | at | your | cookout.",
          "I'm so sorry about what I said at your cookout.", { flags: { 6: CARNE },
            neutral: t("Perdóname | por | lo que | dije | en | tu | parrillada.", "Forgive me | for | what | I-said | at | your | cookout.", "I'm so sorry about what I said at your cookout.") }),
          note: "“Perdóname” is warm and normal between friends." },
        { id: "apologize", s: t("Quiero | pedirte | perdón.", "I-want | to ask you | forgiveness.", "I want to apologize.") },
        { id: "hope_forgive", s: t("Espero | que | me | puedas | perdonar.", "I-hope | that | me | you-can | forgive.", "I hope you can forgive me.", { flags: { 3: SUBJ } }) },
      ],
    },
    detail: {
      lt: "Say exactly what you're sorry for",
      items: [
        { id: "for_said", s: t("Por | lo que | dije | de | ti.", "For | what | I-said | about | you.", "For what I said about you.") },
        { id: "for_boat", s: t("Por | decir | que | nunca | terminas | nada.", "For | saying | that | never | you-finish | anything.", "For saying you never finish anything.",
          { flags: { 5: NADA } }) },
        { id: "for_silence", s: t("Y | por | dos | meses | de | silencio.", "And | for | two | months | of | silence.", "And for two months of silence.") },
      ],
    },
    responsibility: {
      lt: "Take responsibility",
      items: [
        { id: "was_wrong", s: t("Me equivoqué, | y | es | mi | culpa.", "I was wrong, | and | it's | my | fault.", "I was wrong, and that's on me.") },
        { id: "no_excuse", s: t("No hay | excusa | para | lo que | dije.", "There's no | excuse | for | what | I-said.", "There's no excuse for what I said.") },
        { id: "you_right", s: t("Tenías razón, | y | fui | demasiado | {m:orgulloso|f:orgullosa} | para | llamarte.", "You were right, | and | I-was | too | proud | to | call you.",
          "You were right, and I was too proud to call.") },
        { id: "my_fault", s: t("Fue | mi | culpa.", "It-was | my | fault.", "It was my fault.") },
        { id: "out_of_line", s: t("Me pasé. | No te merecías | eso.", "I went too far. | You didn't deserve | that.", "That was out of line. You didn't deserve that."),
          note: "Pasarse (de la raya): go too far." },
      ],
    },
    why: {
      lt: "Explain why you didn't call",
      items: [
        { id: "heavy_coat", s: t("El | orgullo | pesa, | y | lo | cargué | demasiado | tiempo.", "— | Pride | weighs, | and | it | I-carried | too much | time.",
          "Pride's heavy, and I carried it too long.", { flags: { 0: ART_GEN } }) },
        { id: "proud_call", s: t("Fui | demasiado | {m:orgulloso|f:orgullosa} | para | llamarte.", "I-was | too | proud | to | call you.", "I was too proud to call.") },
        { id: "didnt_know", s: t("No sabía | qué | decir.", "I didn't know | what | to say.", "I didn't know what to say.") },
        { id: "kept_waiting", s: t("Estaba | esperando | el | momento | perfecto.", "I-was | waiting (for) | the | moment | perfect.", "I kept waiting for the perfect moment.") },
      ],
    },
    time: {
      lt: "Accept that Diego needs time",
      items: [
        { id: "understand_time", s: t("Entiendo | si | necesitas | tiempo.", "I-understand | if | you-need | time.", "I understand if you need time.") },
        { id: "say_so", s: t("Dime | y | me voy.", "Tell me | and | I'll-go.", "Just say so, and I'll go.") },
        { id: "take_time", s: t("Sin | presión. | Tómate tu tiempo.", "Without | pressure. | Take your time.", "No pressure. Take your time.") },
        { id: "call_ready", s: t("Llámame | cuando | estés | {sm:listo|sf:lista}.", "Call me | when | you're | ready.", "Call me when you're ready.", { flags: { 2: SUBJ } }) },
      ],
    },
    make_up: {
      lt: "Ask how you can make it up to him",
      items: [
        { id: "make_it_up", s: t("¿Cómo | te lo | puedo | compensar?", "How | it to you | I-can | make up?", "How can I make it up to you?") },
        { id: "what_do", s: t("¿Qué | puedo | hacer | para | arreglarlo?", "What | I-can | do | to | fix it?", "What can I do to fix this?") },
        { id: "buy_dinner", s: t("Déjame | invitarte | a | cenar.", "Let me | treat you | to | dinner.", "Let me buy you dinner."),
          note: "Invitar: you pay." },
        { id: "help_boat", s: t("Te | ayudo | a | terminar | la | lancha.", "You | I'll-help | to | finish | the | boat.", "I'll help you finish the boat.") },
      ],
    },
    promise: {
      lt: "Promise it won't happen again",
      items: [
        { id: "wont_happen", s: t("No se va | a | repetir.", "It's not going | to | happen again.", "It won't happen again.") },
        { id: "words_cheap", s: t("Hechos, | no | palabras. | Ya | verás.", "Actions, | not | words. | Already | you'll-see.", "Actions, not words. You'll see.") },
        { id: "call_more", s: t("Te | voy | a | llamar | más | seguido. | Te lo | prometo.", "You | I'm-going | to | call | more | often. | It to you | I-promise.",
          "I'll call more often. I promise.") },
      ],
    },
    deal: {
      lt: "Accept Diego's terms",
      items: [
        { id: "deal_ok", s: t("Trato hecho.", "Deal.", "Deal.") },
        { id: "you_got_it", s: t("¡Sale!", "You got it!", "You got it!", { flags: { 0: "Mexican: sale = okay, deal." },
          neutral: t("¡De acuerdo!", "Agreed!", "You got it!") }), register: "casual" },
        { id: "name_day", s: t("Tú | dime | cuándo.", "You | tell me | when.", "Name the day.") },
        { id: "cant_cook", s: t("¡Pero | yo | no sé | cocinar!", "But | I | don't know how | to cook!", "But I can't cook!"), note: "A joke works too." },
      ],
    },
    start_over: {
      lt: "Ask if you can start over",
      items: [
        { id: "start_over", s: t("¿Empezamos | de nuevo?", "Shall-we-start | again?", "Can we start over?") },
        { id: "start_over_me_you", s: t("¿Empezamos | de nuevo, | tú | y | yo?", "Shall-we-start | again, | you | and | me?", "Can we start over, you and me?") },
        { id: "friends_again", s: t("¿Podemos | volver | a | ser | amigos?", "Can-we | go back | to | being | friends?", "Can we be friends again?") },
        { id: "put_behind", s: t("¿Borrón y cuenta nueva?", "Clean slate?", "Can we put this behind us?", { flags: { 0: BORRON } }),
          note: "A favorite in Mexico for a fresh start." },
      ],
    },
    thanks: {
      lt: "Thank him for hearing you out",
      items: [
        { id: "heard_out", s: t("Gracias | por | escucharme.", "Thanks | for | listening to me.", "Thank you for hearing me out.") },
        { id: "thanks_door", s: t("Gracias | por | no cerrarme | la | puerta.", "Thanks | for | not shutting on me | the | door.", "Thanks for not slamming the door.") },
        { id: "missed_you", s: t("Te | extrañé, | Diego.", "You | I-missed, | Diego.", "I missed you, Diego.") },
      ],
    },
    nora: {
      lt: "Say hello to Natalia",
      items: [
        { id: "hi_nora", s: t("¡Hola, | Natalia! | ¡Qué | gusto | verte!", "Hi, | Natalia! | What | joy | to see you!", "Hi, Natalia! It's so good to see you.") },
        { id: "nora_missed", s: t("Los | extrañé.", "You all | I-missed.", "I missed you guys.", { flags: { 0: "los: you (both of you)." } }) },
      ],
    },
  },

  tips: TIPS,

  merges: {
    "cuánto tiempo": { reason: "lexical_expression", split: "cuánto → how much + tiempo → time; the greeting = long time (no see).", minimal: "Two words." },
    "se te ofrece": { reason: "lexical_expression", split: "se → itself + te → to you + ofrece → offers; = what do you need, what can I do for you.", minimal: "Three words." },
    "por aquí": { reason: "lexical_expression", split: "por → through + aquí → here; = around here.", minimal: "Two words." },
    "ya sabes": { reason: "lexical_expression", split: "ya → already + sabes → you know; = you know (of course).", minimal: "Two words." },
    "la verdad": { reason: "lexical_expression", split: "la → the + verdad → truth; at the end of a sentence = really, honestly.", minimal: "Two words." },
    "enfrente de": { reason: "lexical_expression", split: "enfrente → opposite + de → of; = in front of.", minimal: "Two words." },
    "carne asada": { reason: "lexical_expression", split: "carne → meat + asada → grilled; the party = a cookout.", minimal: "Two words." },
    "ni siquiera": { reason: "lexical_expression", split: "ni → nor + siquiera → at least; = not even.", minimal: "Two words." },
    "y ya": { reason: "lexical_expression", split: "y → and + ya → already is false; = and that's it, just.", minimal: "Two words." },
    "en serio": { reason: "lexical_expression", split: "en → in + serio → serious; = seriously, for real.", minimal: "Two words." },
    "por fin": { reason: "lexical_expression", split: "por → for + fin → end; = finally.", minimal: "Two words." },
    "me conformo": { reason: "grammatical_fusion", split: "me → myself + conformo → I content; conformarse = settle for, be happy with.", minimal: "Two words." },
    "ya que": { reason: "lexical_expression", split: "ya → already + que → that is false; = since.", minimal: "Two words." },
    "trato hecho": { reason: "lexical_expression", split: "trato → deal + hecho → done; = it's a deal.", minimal: "Two words." },
    "así se habla": { reason: "lexical_expression", split: "así → like this + se habla → one speaks; = now you're talking.", minimal: "Three words." },
    "ya veremos": { reason: "lexical_expression", split: "ya → already + veremos → we will see; = we'll see.", minimal: "Two words." },
    "vamos por partes": { reason: "lexical_expression", split: "vamos → let's go + por → by + partes → parts; = one thing at a time.", minimal: "Three words." },
    "no he oído": { reason: "grammatical_fusion", split: "no → not + he → I have + oído → heard; English puts the negation inside: I haven't heard.", minimal: "Three words." },
    "borrón y cuenta nueva": { reason: "lexical_expression", split: "borrón → smudge + y → and + cuenta → account + nueva → new; the idiom = a clean slate.", minimal: "Four words." },
    "cuando quieras": { reason: "lexical_expression", split: "cuando → when + quieras → you want; the reply to thanks = anytime.", minimal: "Two words." },
    "un día de estos": { reason: "lexical_expression", split: "un → a + día → day + de → of + estos → these; = sometime soon.", minimal: "Four words." },
    "ha pasado": { reason: "grammatical_fusion", split: "ha → has + pasado → passed; time that has passed = it's been.", minimal: "Two words." },
    "tenías razón": { reason: "lexical_expression", split: "tenías → you had + razón → reason; tener razón = be right.", minimal: "Two words." },
    "me pasé": { reason: "grammatical_fusion", split: "me → myself + pasé → I passed; pasarse = go too far.", minimal: "Two words." },
    "me voy": { reason: "grammatical_fusion", split: "me → myself + voy → I go; irse = leave.", minimal: "Two words." },
    "tómate tu tiempo": { reason: "lexical_expression", split: "tómate → take + tu → your + tiempo → time; = take your time.", minimal: "Three words." },
    "se me pasó": { reason: "grammatical_fusion", split: "se → itself + me → to me + pasó → it passed; pasársele algo a alguien = get over it.", minimal: "Three words." },
    "poco a poco": { reason: "lexical_expression", split: "poco → little + a → to + poco → little; = little by little, gradually.", minimal: "Three words." },
  },

  // -------------------------------------------------------------------------

  steps: [
    { id: "door", done: (c) => !!c.s.talkOpen,
      ask: (c) => dan(c, "door_what"),
      expects: ["g_hello", "voc_unknown", "its_me", "long_time", "i_know", "ask_how", "g_howareyou", "can_talk", "come_in", "apologize", "apology_detail",
        "own_it", "why_silent", "sorry_but", "excuse", "didnt_mean", "blame", "rude", "g_sorry", "still_mad"],
      suggest: [{ lt: "Ask Diego to talk", hint: "talk" }, { lt: "Apologize right away", hint: "apology" }],
      yes: (c) => { openYesNo(c, true); }, no: (c) => { openYesNo(c, false); },
      help: (c) => dan(c, "nudge_apology") },
    { id: "apology", when: (c) => !!c.s.talkOpen, done: (c) => !!c.s.apologyDone,
      ask: (c) => {
        const w = c.s.want ?? c.s.asked;
        c.s.want = undefined;
        if (w === "goon" || w === "forwhat") { c.s.asked = w; dan(c, w === "goon" ? "door_apology" : "sorry_for_what"); return; }
        if (!c.s.listenSaid) { c.s.listenSaid = true; dan(c, "listening"); return; }
        dan(c, "nudge_apology");
      },
      expects: ["apologize", "apology_detail", "own_it", "why_silent", "sorry_but", "excuse", "didnt_mean", "blame", "rude", "g_sorry", "ask_how", "g_howareyou", "still_mad"],
      suggest: (c) => c.s.asked === "goon" || c.s.asked === "forwhat"
        ? [{ lt: "Say exactly what you're sorry for", hint: "detail" }, { lt: "Take responsibility", hint: "responsibility" }]
        : [{ lt: "Apologize from the heart, with no “pero”", hint: "apology" }, { lt: "Say what you're sorry for", hint: "detail" }],
      yes: (c) => { openYesNo(c, true); }, no: (c) => { openYesNo(c, false); },
      help: (c) => dan(c, "nudge_apology") },
    { id: "responsibility", when: (c) => !!c.s.apologyDone, done: respDone,
      ask: (c) => {
        if (!c.s.hurtSaid) {
          c.s.hurtSaid = true;
          if (!c.s.ownDone) { dan(c, "dan_hurt"); dan(c, c.s.quote ? "dan_quote" : "that_hurt"); }
          if (!c.s.whyAnswered) dan(c, "ask_why_silent");
          return;
        }
        dan(c, c.s.ownDone ? "why_again" : "own_nudge");
      },
      expects: ["own_it", "true_ctx", "why_silent", "dunno_why_ctx", "apologize", "apology_detail", "sorry_but", "excuse", "didnt_mean", "blame", "rude", "promise", "still_mad"],
      suggest: (c) => c.s.ownDone
        ? [{ lt: "Explain why you didn't call", hint: "why" }, { lt: "Take responsibility", hint: "responsibility" }]
        : [{ lt: "Take responsibility", hint: "responsibility" }, { lt: "Explain why you didn't call", hint: "why" }],
      yes: (c) => { openYesNo(c, true); }, no: (c) => { openYesNo(c, false); },
      // "No sé" (why I didn't call): Diego lets the why go
      help: (c) => {
        if (!c.s.whyAnswered) c.s.whySkipped = true;
        if (!c.s.ownDone) { dan(c, "own_nudge"); return; }
        dan(c, "ack");
        c.ask("turn");
      } },
    { id: "turn", when: respDone, done: (c) => !!c.s.turnDone,
      ask: (c) => {
        if (c.s.mood === "needs_time") {
          if (!c.s.needSaid) { c.s.needSaid = true; dan(c, "need_time"); return; }
          dan(c, "just_time");
          return;
        }
        dan(c, c.s.saidWrong ? "dan_first_time" : "dan_thats_new");
        dan(c, "dan_wrong_too");
        c.s.turnDone = true;
      },
      expects: ["accept_time", "push", "time_q", "missed_you", "thanks_hearing", "g_thanks", "make_up_q", "offer", "start_over", "promise", "apologize", "hi_nora", "still_mad"],
      suggest: (c) => timeOpen(c)
        ? [{ lt: "Accept that Diego needs time", hint: "time" }]
        : [{ lt: "Thank him for hearing you out", hint: "thanks" }, { lt: "Ask how you can make it up to him", hint: "make_up" }],
      yes: (c) => { openYesNo(c, true); },
      no: (c) => { openYesNo(c, false); },
      help: (c) => { if (timeOpen(c)) dan(c, "just_time"); } },
    // Twist: Natalia from inside the house
    { id: "nora", when: (c) => !!c.s.noraTwist && !!c.s.turnDone, done: (c) => !!c.s.noraDone,
      ask: (c) => {
        c.s.noraDone = true;
        c.twist("nora");
        c.event("enter", { npc: "nora" });
        if (c.s.mood === "open") nora(c, "nora_hall");
        nora(c, "nora_coffee");
        dan(c, "dan_nora_aside");
      },
      expects: ["hi_nora", "voc_unknown", "g_hello", "missed_you", "thanks_hearing", "g_thanks", "make_up_q", "offer", "start_over"],
      suggest: [{ lt: "Say hello to Natalia", hint: "nora" }, { lt: "Ask how you can make it up to him", hint: "make_up" }],
      yes: (c) => { openYesNo(c, true); }, no: (c) => { openYesNo(c, false); } },
    { id: "make_up", when: (c) => !!c.s.turnDone, done: (c) => !!c.s.makeUpDone,
      ask: (c) => {
        if (c.s.dealOffered) { dan(c, "deal_q"); return; }
        const n = c.s.whatNow ?? 0;
        if (n < 2) { c.s.whatNow = n + 1; dan(c, "so_what_now"); return; }
        offerPrice(c, false);
      },
      expects: ["make_up_q", "offer", "offer_ctx", "deal_ctx", "cant_cook", "promise", "start_over", "missed_you", "thanks_hearing", "g_thanks", "what_cook"],
      suggest: (c) => c.s.dealOffered
        ? [{ lt: "Accept Diego's terms", hint: "deal" }]
        : [{ lt: "Ask how you can make it up to him", hint: "make_up" }, { lt: "Promise it won't happen again", hint: "promise" }],
      yes: (c) => { openYesNo(c, true); },
      no: (c) => { openYesNo(c, false); },
      // "No sé" (what now): Diego knows
      help: (c) => { if (c.s.dealOffered) dan(c, "deal_q"); else offerPrice(c, true); } },
    { id: "start_over", when: (c) => !!c.s.makeUpDone, done: (c) => !!c.s.startOverDone,
      ask: (c) => {
        if (!c.s.elseSaid) { c.s.elseSaid = true; dan(c, "anything_else"); return; }
        offerStart(c);
      },
      expects: ["start_over", "missed_you", "thanks_hearing", "g_thanks", "promise", "nothing_else_ctx", "what_cook"],
      suggest: [{ lt: "Ask if you can start over", hint: "start_over" }, { lt: "Thank him for hearing you out", hint: "thanks" }],
      yes: (c) => { if (!openYesNo(c, true)) { dan(c, "tell_me"); c.hold(); } },
      no: (c) => { if (!openYesNo(c, false)) offerStart(c); },
      help: (c) => offerStart(c) },
  ],

  init: (c) => {
    c.s.mood = c.chance(0.4) ? "needs_time" : "open";
    c.s.noraTwist = c.chance(0.5);
    c.s.variant = c.pick(["dinner", "boat", "stay"] as const);
    c.s.quote = c.chance(0.5);
  },

  start: (c) => {
    dan(c, "door_open");
    c.hold(); // the door step is the open question ("¿Qué se te ofrece?" only if asked again)
  },

  handlers: {} as Record<string, H>,

  finish: (c) => {
    c.s.goalMet = true;
    c.complete();
    c.remember({ danReconciled: true });
    c.event("outro", { outcome: "reconciled", lt: OUTRO.reconciled });
    const said = (((c as any).conv?.history ?? []) as { who: string; text: string }[]).filter((h) => h.who === "you").map((h) => h.text).join(" ");
    if (said.split(/\s+/).filter(Boolean).length > 60 || c.chance(0.5)) dan(c, "talk_too_much");
    dan(c, c.s.noraDone || c.chance(0.5) ? "come_home_michi" : "come_home");
    dan(c, "boat_final");
    const on: Record<string, (cc: Ctx) => void> = {};
    for (const k of [...Object.keys(startOver.intents).filter((x) => !x.endsWith("_ctx")), "g_bye", "g_thanks", "g_ok", "g_hello", "g_sorry", "g_howareyou"]) on[k] = closeOut;
    c.expect({ id: "closing", expects: ["thanks_hearing", "missed_you"], hints: ["thanks"], suggest: [{ lt: "Thank him for hearing you out", hint: "thanks" }],
      on, yes: closeOut, no: closeOut });
  },

  tests: [
    // the door
    { say: "¿Tienes un minuto?", intent: "can_talk", step: "door" },
    { say: "¿Podemos hablar?", intent: "can_talk", step: "door" },
    { say: "¿Podemos platicar un momento?", intent: "can_talk", step: "door" },
    { say: "Vine a disculparme.", intent: "apologize", step: "door" },
    { say: "Sí, ya sé. Ha pasado mucho tiempo.", intent: "long_time", step: "door" },
    { say: "¿Puedo pasar?", intent: "come_in", step: "door" },
    { say: "¿Cómo va la lancha?", intent: "ask_how", step: "door" },
    { say: "¿Tenéis un momento?", intent: "can_talk", step: "door" },
    // the apology
    { say: "Diego, te debo una disculpa.", intent: "apologize", step: "apology" },
    { say: "Siento mucho lo que dije.", intent: "apologize", step: "apology" },
    { say: "Perdóname por lo que dije en tu carne asada.", intent: "apologize", step: "apology" },
    { say: "Quiero pedirte perdón.", intent: "apologize", step: "apology" },
    { say: "Espero que me puedas perdonar.", intent: "apologize", step: "apology" },
    { say: "Te pido una disculpa por lo que dije enfrente de todos.", intent: "apologize", step: "apology" },
    { say: "Me siento muy mal por lo que te dije.", intent: "apologize", step: "apology" },
    { say: "Perdón por no llamarte.", intent: "apologize", step: "apology" },
    { say: "Por lo que dije de ti.", intent: "apology_detail", step: "apology" },
    { say: "Por decir que nunca terminas nada.", intent: "apology_detail", step: "apology" },
    { say: "Y por dos meses de silencio.", intent: "apology_detail", step: "apology" },
    { say: "Lo siento, tío.", intent: "apologize", step: "apology" },
    // responsibility
    { say: "Me equivoqué, y es mi culpa.", intent: "own_it", step: "responsibility" },
    { say: "No hay excusa para lo que dije.", intent: "own_it", step: "responsibility" },
    { say: "Tenías razón, y fui demasiado orgulloso para llamarte.", intent: "own_it", step: "responsibility" },
    { say: "Fue mi culpa.", intent: "own_it", step: "responsibility" },
    { say: "Me pasé. No te merecías eso.", intent: "own_it", step: "responsibility" },
    { say: "La regué.", intent: "own_it", step: "responsibility" },
    { say: "La he liado.", intent: "own_it", step: "responsibility" },
    { say: "El orgullo pesa, y lo cargué demasiado tiempo.", intent: "why_silent", step: "responsibility" },
    { say: "Fui demasiado orgullosa para llamarte.", intent: "why_silent", step: "responsibility" },
    { say: "No sabía qué decir.", intent: "why_silent", step: "responsibility" },
    { say: "Estaba esperando el momento perfecto.", intent: "why_silent", step: "responsibility" },
    { say: "Me daba vergüenza llamarte.", intent: "why_silent", step: "responsibility" },
    // bad moves
    { say: "Lo siento, pero era una broma.", intent: "sorry_but", step: "apology" },
    { say: "Siento que te sientas así.", intent: "sorry_but", step: "apology", not: ["apologize"] },
    { say: "Perdón si te ofendí.", intent: "sorry_but", step: "apology", not: ["apologize"] },
    { say: "Estaba muy cansado ese día.", intent: "excuse", step: "apology" },
    { say: "No fue mi intención lastimarte.", intent: "didnt_mean", step: "apology" },
    { say: "Tú empezaste.", intent: "blame", step: "apology" },
    { say: "Era solo una broma.", intent: "rude", step: "apology" },
    { say: "No es para tanto.", intent: "rude", step: "apology" },
    // Diego's turn
    { say: "Entiendo si necesitas tiempo.", intent: "accept_time", step: "turn" },
    { say: "Dime y me voy.", intent: "accept_time", step: "turn" },
    { say: "Sin presión. Tómate tu tiempo.", intent: "accept_time", step: "turn" },
    { say: "Llámame cuando estés listo.", intent: "accept_time", step: "turn" },
    { say: "Ya perdóname.", intent: "push", step: "turn", not: ["apologize"] },
    { say: "¿Podemos olvidarlo?", intent: "push", step: "turn" },
    { say: "¿Cuánto tiempo necesitas?", intent: "time_q", step: "turn" },
    { say: "Gracias por escucharme.", intent: "thanks_hearing", step: "turn" },
    { say: "Gracias por no cerrarme la puerta.", intent: "thanks_hearing", step: "turn" },
    { say: "Te extrañé, Diego.", intent: "missed_you", step: "turn" },
    { say: "Te he echado de menos.", intent: "missed_you", step: "turn" },
    // Natalia
    { say: "¡Hola, Natalia! ¡Qué gusto verte!", intent: "hi_nora", step: "nora" },
    { say: "Los extrañé.", intent: "missed_you", step: "nora" },
    { say: "Os eché de menos.", intent: "missed_you", step: "nora" },
    // making it up
    { say: "¿Cómo te lo puedo compensar?", intent: "make_up_q", step: "make_up" },
    { say: "¿Qué puedo hacer para arreglarlo?", intent: "make_up_q", step: "make_up" },
    { say: "Déjame invitarte a cenar.", intent: "offer", step: "make_up" },
    { say: "Te invito unas chelas.", intent: "offer", step: "make_up" },
    { say: "Te ayudo a terminar la lancha.", intent: "offer", step: "make_up" },
    { say: "Trato hecho.", intent: "deal_ctx", step: "make_up" },
    { say: "Tú dime cuándo.", intent: "deal_ctx", step: "make_up" },
    { say: "¡Pero yo no sé cocinar!", intent: "cant_cook", step: "make_up" },
    { say: "No se va a repetir.", intent: "promise", step: "make_up" },
    { say: "Hechos, no palabras. Ya verás.", intent: "promise", step: "make_up" },
    { say: "Te voy a llamar más seguido. Te lo prometo.", intent: "promise", step: "make_up" },
    // starting over
    { say: "¿Empezamos de nuevo?", intent: "start_over", step: "start_over" },
    { say: "¿Empezamos de nuevo, tú y yo?", intent: "start_over", step: "start_over" },
    { say: "¿Podemos volver a ser amigos?", intent: "start_over", step: "start_over" },
    { say: "¿Borrón y cuenta nueva?", intent: "start_over", step: "start_over" },
    { say: "¿Hacemos las paces?", intent: "start_over", step: "start_over" },
    { say: "¿Podemos empezar sobre?", intent: "start_over", step: "start_over" },
    { say: "Nada, gracias.", intent: "nothing_else_ctx", step: "start_over" },
    { say: "Gracias, carnal.", intent: "thanks_mate", step: "start_over" },
    { say: "No sé por qué.", intent: "dunno_why_ctx", step: "responsibility" },
    { say: "Me dio vergüenza.", intent: "why_silent", step: "responsibility" },
    { say: "¿Y si empezamos de nuevo?", intent: "start_over", step: "start_over" },
    { say: "Te invito a cenar.", intent: "offer", step: "make_up" },
    { say: "¿Me puedes perdonar?", intent: "apologize", step: "apology" },
    // meaning must not flip
    { say: "No lo siento.", intent: "yn:no", step: "apology", not: ["apologize", "g_sorry"] },
    { say: "No me arrepiento de nada.", intent: "none", step: "apology", not: ["apologize"] },
    { say: "No me equivoqué.", intent: "none", step: "responsibility", not: ["own_it", "g_sorry"] },
    { say: "No fue mi culpa.", intent: "none", step: "responsibility", not: ["own_it"] },
    { say: "No era una broma.", intent: "none", step: "apology", not: ["rude"] },
    { say: "No te extrañé.", intent: "none", step: "turn", not: ["missed_you"] },
    { say: "No te voy a invitar a cenar.", intent: "none", step: "make_up", not: ["offer"] },
    { say: "No quiero empezar de nuevo.", intent: "none", step: "start_over", not: ["start_over"] },
    { say: "No te lo prometo.", intent: "none", step: "make_up", not: ["promise"] },
    { say: "No me parece justo.", intent: "none", step: "make_up", not: ["deal_ctx"] },
    { say: "Ya no somos amigos.", intent: "none", step: "start_over", not: ["start_over"] },
    { say: "Trato hecho.", intent: "none", step: "door", not: ["deal_ctx"] },
    { say: "Lo siento, pero tenía razón.", intent: "sorry_but", step: "apology", not: ["own_it"] },
    { say: "No tienes razón.", intent: "none", step: "responsibility", not: ["own_it"] },
    { say: "No necesito tiempo.", intent: "none", step: "turn", not: ["accept_time"] },
    // review: a bare "Es verdad" admits it (not the "¡pero es verdad!" jab); negations that keep their meaning
    { say: "Fui muy injusto.", intent: "own_it", step: "responsibility" },
    { say: "Es verdad, lo dije.", intent: "none", step: "door", not: ["rude", "own_it"] },
    { say: "Pero es verdad.", intent: "rude", step: "apology", not: ["own_it"] },
    { say: "No estuvo bien lo que dije.", intent: "own_it", step: "responsibility" },
    { say: "Siento que te hayas sentido así.", intent: "sorry_but", step: "apology", not: ["apologize"] },
    { say: "No quiero presionarte.", intent: "accept_time", step: "turn", not: ["push"] },
    { say: "No te voy a presionar.", intent: "accept_time", step: "turn", not: ["push"] },
    { say: "Tú tampoco me llamaste.", intent: "blame", step: "responsibility", not: ["own_it", "why_silent"] },
    { say: "No supe cómo decírtelo.", intent: "why_silent", step: "responsibility" },
    { say: "Porque soy muy orgulloso.", intent: "why_silent", step: "responsibility" },
    { say: "Por lo que dije en la fiesta enfrente de todos.", intent: "apology_detail", step: "apology" },
    { say: "¿Tienes un ratito para platicar?", intent: "can_talk", step: "door" },
    { say: "No puedo cocinar.", intent: "cant_cook", step: "make_up" },
    { say: "Ya no quiero ser tu amigo.", intent: "none", step: "start_over", not: ["start_over"] },
    // audit (5 Nov 2026): side questions and answers that had no reply, or the wrong one
    { say: "¿Sigues enojado?", intent: "still_mad", step: "turn" },
    { say: "¿Todavía estás enojado conmigo?", intent: "still_mad", step: "door" },
    { say: "¿Por qué sigues enojado?", intent: "push", step: "turn", not: ["still_mad"] },
    { say: "¿Me perdonas?", intent: "apologize", step: "apology" },
    { say: "A disculparme.", intent: "apologize", step: "apology", not: ["blame"] },
    { say: "No quiero pelear.", intent: "can_talk", step: "apology", not: ["blame", "rude"] },
    { say: "Solo quería saludarte.", intent: "can_talk", step: "door" },
    { say: "Me imagino.", intent: "i_know", step: "door" },
    { say: "¿Puedo volver mañana?", intent: "time_q", step: "turn" },
    { say: "¿Te llamo la próxima semana?", intent: "time_q", step: "turn" },
    { say: "Tú dime.", intent: "deal_ctx", step: "make_up" },
    { say: "Lo que necesites.", intent: "deal_ctx", step: "make_up", not: ["accept_time"] },
    { say: "¿Qué quieres que cocine?", intent: "what_cook", step: "make_up" },
    { say: "¿Qué hago?", intent: "make_up_q", step: "make_up", not: ["what_cook", "apology_detail"] },
    { say: "Pero no sé nada de lanchas.", intent: "cant_cook", step: "make_up" },
    { say: "No estoy enojado.", intent: "none", step: "turn", not: ["still_mad"] },
    { say: "Te fallé como amigo.", intent: "own_it", step: "responsibility" },
    { say: "No te fallé.", intent: "none", step: "responsibility", not: ["own_it"] },
    // not understood
    { say: "Mi perro come plátanos los martes.", intent: "none" },
    { say: "El cielo es verde y la mesa canta.", intent: "none" },
    { say: "teclado banana martes", intent: "none" },
  ],

  sims: [
    // "Siento que te sientas así." has no "pero": a reply of its own ("¿O sea que ahora es mi culpa?"), then a real apology
    { name: "a non-apology, then a real one", turns: [
      "Hola, Diego. ¿Podemos hablar?", "Siento que te sientas así.", "Siento mucho lo que dije en tu carne asada.", "Me equivoqué, y es mi culpa.",
      "Gracias por escucharme.", "¿Cómo te lo puedo compensar?", "Trato hecho.", "¿Empezamos de nuevo?", "Gracias.",
    ], expect: { complete: true, state: { badMoves: 1, lastBad: "non_apology" } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; s.noraTwist = false; s.variant = "dinner"; } },
    // "Lo siento, pero…" keeps the "pero" reply
    { name: "sorry, but…", turns: [
      "Hola, Diego. ¿Podemos hablar?", "Lo siento, pero era una broma.", "Siento mucho lo que dije en tu carne asada.", "Tenías razón, y fui demasiado orgulloso para llamarte.",
      "Gracias por escucharme.", "¿Cómo te lo puedo compensar?", "Trato hecho.", "¿Empezamos de nuevo?", "Gracias.",
    ], expect: { complete: true, state: { badMoves: 1, lastBad: "sorry_but" } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; s.noraTwist = false; s.variant = "stay"; } },
    // "¿Algo más que quieras decir?" – "Nada, gracias." – "¿Borrón y cuenta nueva o qué?" – "Empecemos otra vez."
    { name: "nothing else; let's start again", turns: [
      "Hola, Diego. ¿Podemos hablar?", "Siento mucho lo que dije en tu carne asada.", "Tenías razón, y fui demasiado orgulloso para llamarte.",
      "¿Cómo te lo puedo compensar?", "Trato hecho.", "Nada, gracias.", "Empecemos otra vez.", "Gracias por escucharme.",
    ], expect: { complete: true, state: { startOverDone: true, anytimeSaid: undefined } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; s.noraTwist = false; s.variant = "boat"; } },
    // "¿Algo más que quieras decir?" – "Gracias." – "Cuando quieras…", then the question; a bare "Sí" answers it
    { name: "anything else? thank you", turns: [
      "Hola, Diego. ¿Podemos hablar?", "Siento mucho lo que dije en tu carne asada.", "Tenías razón, y fui demasiado orgulloso para llamarte.",
      "¿Cómo te lo puedo compensar?", "Trato hecho.", "Gracias.", "Sí.", "Gracias.",
    ], expect: { complete: true, state: { startOverDone: true, anytimeSaid: true, closed: true } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; s.noraTwist = false; s.variant = "dinner"; } },
    // the open branch, no Natalia: the classic way through
    { name: "open: the classic apology", turns: [
      "Hola, Diego. ¿Tienes un minuto?", "Te debo una disculpa.", "Por lo que dije en tu fiesta. No hay excusa para eso.", "Fui demasiado orgulloso para llamarte.",
      "Gracias por escucharme.", "¿Cómo te lo puedo compensar?", "Trato hecho.", "¿Empezamos de nuevo?", "¡Gracias!",
    ], expect: { complete: true, state: { thanked: true, makeUpDone: true } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; s.noraTwist = false; s.variant = "dinner"; } },
    // the twist on every seed: Diego needs time, the learner accepts, Diego calls them back; then Natalia
    { name: "needs time (twist): Diego calls you back, then Natalia", turns: [
      "Hola. ¿Podemos hablar?", "Perdóname por lo que dije de la lancha.", "Me equivoqué. No te lo merecías.", "No sabía qué decir.",
      "Entiendo si necesitas tiempo.", "Gracias.", "¡Hola, Natalia!", "¿Cómo te lo puedo compensar?", "Claro.", "¿Empezamos de nuevo, tú y yo?", "Gracias por escucharme.",
    ], expect: { complete: true, state: { timeOk: true, noraDone: true } }, auto: AUTO,
      setup: (s) => { s.mood = "needs_time"; s.noraTwist = true; s.variant = "boat"; } },
    // bad moves get an in-world reply and a tip, never a failure
    { name: "bad moves, then a real apology", turns: [
      "Hola.", "¿Puedo pasar?", "Lo siento, pero tú también fuiste grosero.", "Estaba borracho.", "Perdón.", "Por todo lo que dije.", "Fue mi culpa.", "Por orgullo.",
      "Ya perdóname.", "Bueno, me voy.", "Déjame invitarte a cenar.", "Te extrañé.", "Sí.",
    ], expect: { complete: true, state: { badMoves: 2, pushes: 1 } }, auto: AUTO,
      setup: (s) => { s.mood = "needs_time"; s.noraTwist = false; s.variant = "dinner"; } },
    // pushing twice and asking how long, then accepting
    { name: "needs time: pushing, then accepting", turns: [
      "Lo siento mucho por lo que dije enfrente de todos.", "Debí llamarte. Me daba vergüenza.", "Ándale, ya pasaron dos meses.", "Ya estamos grandes para esto.",
      "¿Cuánto tiempo necesitas?", "Te doy tiempo.", "Gracias por escucharme.", "Te invito una cerveza.", "¿Borrón y cuenta nueva?",
    ], expect: { complete: true, state: { pushes: 2, timeOk: true } }, auto: AUTO,
      setup: (s) => { s.mood = "needs_time"; s.noraTwist = false; } },
    // questions first, too soon, a vague apology, Natalia (open branch), "empezar de nuevo" before the price
    { name: "questions, too soon, and Natalia", turns: [
      "¿Cómo está Natalia?", "¿Empezamos de nuevo?", "Bueno. Vine a disculparme.", "Lo siento.", "Por no llamarte. Y por lo que dije de la lancha.",
      "Tenías razón, y fui demasiado orgulloso para llamarte.", "Te extrañé.", "¡Hola, Natalia!", "¿Empezamos de nuevo?", "¡Pero yo no sé cocinar!", "Gracias por escucharme.",
    ], expect: { complete: true, state: { startPending: true, noraDone: true } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; s.noraTwist = true; s.variant = "stay"; } },
    // "No sé" twice: Diego lets the why go, then names the price himself; short answers
    { name: "Diego names the price", turns: [
      "Diego, te debo una disculpa.", "Por decir que nunca terminas nada.", "Me equivoqué.", "No sé.", "Ya lo sé.", "No sé.", "¡Sí!",
      "No va a volver a pasar.", "¿Podemos volver a ser amigos?",
    ], expect: { complete: true, state: { whySkipped: true, saidWrong: true } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; s.noraTwist = false; s.variant = "boat"; } },
    // "No fue mi intención" (the brief), Spain forms, "sale"
    { name: "no fue mi intención, Spain forms", turns: [
      "¿Tenéis un momento?", "Lo siento, no fue mi intención.", "Lo siento mucho por lo que te dije, tío.", "La he liado. No te lo merecías.", "Me daba vergüenza.",
      "Vale, lo entiendo.", "¿Te apetece una cerveza? Yo invito.", "Os eché de menos.", "Sí.",
    ], expect: { complete: true, state: { timeOk: true, lastBad: "didnt_mean" } }, auto: AUTO,
      setup: (s) => { s.mood = "needs_time"; s.noraTwist = false; s.variant = "dinner"; } },
    // review: "Está bien, gracias" while Diego needs time accepts it (it used to get "Solo dame un tiempo" again)
    // review: a bare "Es verdad" admits it (it was the "¡pero es verdad!" jab, a bad move)
    { name: "it's true, I said it", turns: [
      "¿Podemos hablar?", "Perdón por lo que dije de tu lancha.", "Es verdad. Fui muy injusto.", "No sabía qué decir.", "Gracias por escucharme.", "¿Cómo te lo puedo compensar?", "Sale.", "¿Empezamos de nuevo?",
    ], expect: { complete: true, state: { ownDone: true, badMoves: undefined } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; s.noraTwist = false; s.variant = "dinner"; } },
    { name: "needs time: okay, thanks", turns: [
      "Siento mucho lo que dije en tu fiesta.", "Fue mi culpa. No supe cómo decírtelo.", "Está bien, gracias.", "Te ayudo a terminar la lancha.", "¿Amigos otra vez?",
    ], expect: { complete: true, state: { timeOk: true, startOverDone: true } }, auto: AUTO,
      setup: (s) => { s.mood = "needs_time"; s.noraTwist = false; s.variant = "boat"; } },
    // the partial ending: apologized, then left
    { name: "partial ending: leaving after the apology", turns: ["Hola, Diego.", "¿Podemos hablar?", "Perdón por no llamarte.", "Adiós."],
      expect: { complete: false, state: { left: "partial", apologyDone: true } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; } },
    // walked away before any apology
    { name: "walked away early", turns: ["¿Cómo estás?", "Perdón, me tengo que ir."],
      expect: { complete: false, state: { left: "early" } }, auto: AUTO },
    // audit (5 Nov 2026): a bare "Está bien" is a yes (it read as "¿Estamos bien?": "No me presiones" while Diego needed
    // time, and "¿Y? ¿Trato hecho?" again at his price); at "¿Algo más que quieras decir?" it means nothing more
    { name: "a bare 'Está bien' accepts the time and the price", turns: [
      "¿Podemos hablar?", "Siento mucho lo que dije en tu carne asada.", "Me equivoqué.", "No sabía qué decir.", "Está bien.",
      "Gracias por escucharme.", "¿Cómo te lo puedo compensar?", "Está bien.", "Está bien.", "Sí.", "Gracias.",
    ], expect: { complete: true, state: { timeOk: true, pushes: undefined, offerStart: true, startOverDone: true } }, auto: AUTO,
      setup: (s) => { s.mood = "needs_time"; s.noraTwist = false; s.variant = "stay"; } },
    // audit: "No" twice to his price, then twice to "¿Borrón y cuenta nueva o qué?": the joke once, then he lets it go
    // (it was "Respuesta equivocada. Inténtalo otra vez." for ever)
    { name: "no and no again: Diego lets it go", turns: [
      "¿Podemos hablar?", "Siento mucho lo que dije en tu carne asada.", "Fue mi culpa.", "Me daba vergüenza.", "Gracias por escucharme.",
      "¿Cómo te lo puedo compensar?", "No.", "No.", "Nada.", "No.", "No.", "Gracias.",
    ], expect: { complete: true, state: { dealNos: 2, startNos: 2, makeUpDone: true, startOverDone: true } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; s.noraTwist = false; s.variant = "boat"; } },
    // audit: "Hoy no puedo" to "Podrías empezar por quedarte a comer.": "Bueno, otro día. Pero me la debes."
    { name: "can't today: another day", turns: [
      "Hola, Diego. ¿Tienes un minuto?", "Te debo una disculpa.", "Por lo que dije de tu lancha.", "Tenías razón, y fui demasiado orgulloso para llamarte.",
      "Gracias por escucharme.", "¿Qué puedo hacer para arreglarlo?", "Hoy no puedo, pero otro día sí.", "¿Empezamos de nuevo?", "Gracias.",
    ], expect: { complete: true, state: { makeUpDone: true, dealNos: undefined } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; s.noraTwist = false; s.variant = "stay"; } },
    // audit: a bare yes/no to the question in his reaction to a bad move ("¿Quieres intentarlo otra vez?" – "Sí.", "¿O
    // sea que ahora es mi culpa?" – "No.") gets "Te escucho", not "No viniste hasta aquí a hablar del clima"
    { name: "bad-move questions answered yes or no", turns: [
      "¿Podemos hablar?", "No es para tanto.", "Sí.", "Siento que te sientas así.", "No.", "Tú empezaste.", "No quiero pelear.",
      "Siento mucho lo que dije en tu carne asada.", "Me pasé. No te merecías eso.", "Por orgullo.", "Te extrañé.", "¿Cómo te lo puedo compensar?", "Trato hecho.", "¿Empezamos de nuevo?",
    ], expect: { complete: true, state: { badMoves: 3, lastBad: "blame" } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; s.noraTwist = false; s.variant = "dinner"; } },
    // audit: "¿Sigues enojado?" and "¿Me perdonas?" before and after Diego has had his say; "Lo que tú quieras" at
    // "¿Y ahora qué?" (he names his price) and "¿Qué quieres que cocine?" ("Sorpréndeme.", agreed); "Lo siento otra vez"
    { name: "still mad? forgive me? you name it", turns: [
      "¿Sigues enojado?", "Vine a disculparme.", "Perdóname por lo que dije en tu carne asada.", "¿Me perdonas?", "Me equivoqué. No te lo merecías.",
      "No supe cómo decírtelo.", "¿Me perdonas?", "¿Sigues enojado conmigo?", "Lo que tú quieras.", "¿Qué quieres que cocine?", "Lo siento otra vez.", "Sí.", "Gracias.",
    ], expect: { complete: true, state: { makeUpDone: true, startOverDone: true, dealOffered: false } }, auto: AUTO,
      setup: (s) => { s.mood = "open"; s.noraTwist = false; s.variant = "dinner"; } },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

/** "Hola." at the door: a cold "Hola." and "¿Qué se te ofrece?"; to Natalia once she's there, her hello. */
function greet(c: Ctx) {
  if (c.s.goalMet) return;
  if (stepIs(c, "nora") || (c.s.noraDone && /\b(natalia|nata|naty)\b/.test(heard(c)))) {
    if (!c.s.noraHi && once(c, "nora_hi")) { c.s.noraHi = true; nora(c, "nora_hi"); }
    return;
  }
  if (c.s.talkOpen) return; // later on, a hello adds nothing: the open question comes again
  if (once(c, "greet")) {
    if (!c.s.coldSaid) { c.s.coldSaid = true; dan(c, "door_cold"); }
    dan(c, "door_what");
  }
  c.hold();
}

/** An apology: specific ("por lo que dije…"), announced ("Te debo una disculpa") or plain ("Lo siento mucho"). */
function apologyMove(c: Ctx, tags: string[]) {
  if (c.s.goalMet) return;
  c.s.talkOpen = true;
  // "¿Me perdonas?": "Ya te perdoné." once he has had his say, "Solo dame un tiempo." while he needs time
  const forgive = FORGIVE_Q.test(heard(c));
  if (c.s.turnDone) { react(c, forgive ? "forgiven" : "heard_you"); return; }
  if (timeOpen(c)) { react(c, forgive ? "just_time" : "heard_you"); c.hold(); return; }
  if (c.s.apologyDone) {
    // the open question (own it / why) comes again; "¿Me perdonas?" gets only the question
    if (!now(c, "ap_now") && !forgive) react(c, "heard_you");
    return;
  }
  if (tags.includes("silence")) c.s.silenceNamed = true;
  if (tags.includes("specific")) { c.s.apologyDone = true; mark(c, "ap_now"); return; }
  if (!once(c, "apology")) return;
  if (tags.includes("announce")) { c.s.want = "goon"; return; }
  c.s.vague = (c.s.vague ?? 0) + 1;
  if (c.s.vague >= 2) { c.s.apologyDone = true; mark(c, "ap_now"); dan(c, "sorry_accept_vague"); return; }
  c.s.want = "forwhat";
}

function answerWhy(c: Ctx, pride: boolean) {
  if (c.s.whyAnswered) return;
  c.s.whyAnswered = true;
  react(c, pride ? "pride_coat" : "know_that");
}

/** "Lo siento, pero…", excuses, blame, "era una broma", pushing: an in-world reply and a tip. */
function badMove(c: Ctx, kind: "sorry_but" | "excuse" | "blame" | "rude" | "didnt_mean" | "push") {
  if (c.s.goalMet) return;
  if (c.s.turnDone) { if (kind === "blame" || kind === "rude") react(c, "blame_late"); return; }
  c.s.talkOpen = true;
  if (timeOpen(c)) {
    if (kind === "push" || kind === "blame" || kind === "rude") pushMove(c);
    else { react(c, "heard_you"); c.hold(); }
    return;
  }
  if (!once(c, "bad")) { c.hold(); return; }
  const h = heard(c);
  const k0 = kind !== "push" && SORRY_BUT.test(h) ? "sorry_but" : kind;
  // "Siento que te sientas así." / "Se cometieron errores.": no "pero", but no apology either
  const k = k0 === "sorry_but" && !/\bpero\b/.test(h) ? "non_apology" : k0;
  c.s.badMoves = (c.s.badMoves ?? 0) + 1;
  c.s.lastBad = k;
  if (k === "sorry_but") { dan(c, "sorry_but_react"); c.tip(TIPS.sorry_but); }
  else if (k === "non_apology") {
    const you = NON_APOLOGY_YOU.test(h);
    dan(c, you ? "non_apology_you" : "non_apology_react"); c.tip(TIPS.non_apology);
    if (you) { badQuestion(c, "fault"); return; }
  }
  else if (k === "excuse") { dan(c, "excuse_react"); c.tip(TIPS.excuse); }
  else if (k === "blame") { dan(c, "blame_react"); c.tip(TIPS.blame); badQuestion(c, "fight"); return; }
  else if (k === "rude") { dan(c, "rude_react"); c.tip(TIPS.just_joke); badQuestion(c, "retry"); return; }
  else if (k === "push") { dan(c, "rude_react"); c.tip(TIPS.push); badQuestion(c, "retry"); return; }
  else dan(c, "didnt_mean_react");
  c.hold();
}

/** Diego's reaction ended in a question: "¿O sea que ahora es mi culpa?" (fault), "¿Viniste a disculparte o a
 *  pelear?" (fight), "¿Quieres intentarlo otra vez?" (retry). A bare yes or no answers it (it used to get "No viniste
 *  hasta aquí a hablar del clima."); anything else drops it and goes on as usual. */
function badQuestion(c: Ctx, q: "fault" | "fight" | "retry") {
  c.expect({ id: "bad_q", optional: true, on: {}, yes: (cc) => badReply(cc, q, true), no: (cc) => badReply(cc, q, false) });
}
function badReply(c: Ctx, q: "fault" | "fight" | "retry", yes: boolean) {
  // "¿O sea que ahora es mi culpa?" – "Sí.": blaming him
  if (q === "fault" && yes) { badMove(c, "blame"); return; }
  // "¿Quieres intentarlo otra vez?" – "No."
  if (q === "retry" && !yes) { react(c, "nudge_apology"); c.hold(); return; }
  c.s.listenSaid = true;
  react(c, "listening");
  c.hold();
}

/** Pushing while Diego needs time: "No me presiones, ¿sí?", then "Mejor hablamos otro día, ¿sí?" (still open). */
function pushMove(c: Ctx) {
  if (once(c, "push")) {
    c.s.pushes = (c.s.pushes ?? 0) + 1;
    c.tip(TIPS.push);
    dan(c, c.s.pushes >= 2 ? "push_close" : "push_react");
  }
  c.hold();
}

/** The learner accepts that Diego needs time (twist): "Oye. Espera. … Me tomó como diez segundos." */
function acceptTime(c: Ctx) {
  if (c.s.timeOk) return;
  c.s.timeOk = true;
  c.twist("ten_seconds");
  dan(c, "time_ok"); dan(c, "wait_twist"); dan(c, "wait_twist2"); dan(c, "dan_wrong_too");
  c.s.turnDone = true;
  c.hold();
}

/** Diego names his price: a dinner (and you cook), help with the lancha, or staying for lunch. */
function sayPrice(c: Ctx) {
  if (c.s.variant === "boat") dan(c, "make_up_boat");
  else if (c.s.variant === "stay") dan(c, "make_up_stay");
  else { dan(c, "make_up_dinner"); dan(c, "make_up_more"); }
}
function offerPrice(c: Ctx, iDo: boolean) {
  if (iDo) dan(c, "i_do");
  sayPrice(c);
  c.s.dealOffered = true;
  askDeal(c);
}
/** Diego's price is a question ("¿Trato hecho?") whichever step asked it: "Trato hecho", "Sale", a joke about the
 *  cooking or a yes answer it, also while the step is still "turn" (a held turn keeps its step's expects). */
function askDeal(c: Ctx) {
  const run = (id: string) => (cc: Ctx, sl: any, sg: Segment) => { HANDLERS[id](cc, sl, sg); };
  c.expect({ id: "deal", expects: ["deal_ctx", "cant_cook", "promise", "offer", "start_over", "make_up_q", "cant_now_ctx", "what_cook"],
    hints: ["deal"], suggest: [{ lt: "Accept Diego's terms", hint: "deal" }],
    on: { deal_ctx: run("deal_ctx"), cant_cook: run("cant_cook"), promise: run("promise"), offer: run("offer"), start_over: run("start_over"), make_up_q: run("make_up_q"),
      cant_now_ctx: run("cant_now_ctx"), what_cook: run("what_cook") },
    ask: (cc) => dan(cc, "deal_q"),
    yes: (cc) => { openYesNo(cc, true); }, no: (cc) => { openYesNo(cc, false); } });
}
/** Made up: the price is agreed (and "¿Empezamos de nuevo?", asked before it, is answered now). */
function settle(c: Ctx) {
  c.s.makeUpDone = true;
  c.s.dealOffered = false;
  if (c.s.startPending && !c.s.startOverDone) { c.s.startOverDone = true; dan(c, "start_over_yes"); }
}
function acceptDeal(c: Ctx) {
  if (!c.s.dealOffered || !once(c, "deal")) return;
  dan(c, "deal");
  settle(c);
}
function doStartOver(c: Ctx, friends: boolean) {
  if (c.s.startOverDone) return;
  c.s.startOverDone = true;
  // Diego asked "¿Borrón y cuenta nueva o qué?": the learner's yes settles it ("Pues ya está. Tú y yo.")
  dan(c, friends ? "friends_react" : c.s.offerStart ? "start_over_ok" : "start_over_yes");
}
function offerStart(c: Ctx) {
  c.s.offerStart = true;
  dan(c, "dan_offers_start");
  c.hold();
}

/** "Gracias por escucharme" (explicit) or a plain "Gracias". */
function thanks(c: Ctx, explicit: boolean) {
  if (c.s.goalMet) return;
  if (!c.s.apologyDone) { if (explicit) { react(c, "not_yet_heard"); c.hold(); } return; }
  // "Está bien, gracias" / "Vale, gracias" while Diego needs time: accepting it
  if (timeOpen(c)) { if (explicit || /\b(esta bien|vale|de acuerdo|ok|okay|claro|entiendo|sale)\b/.test(heard(c))) { if (explicit) c.s.thanked = true; acceptTime(c); } return; }
  if (!c.s.turnDone) { if (explicit) { c.s.thanked = true; react(c, "ack"); } return; }
  // "Está bien, gracias" at "¿Trato hecho?": no "Cuando quieras"; the question comes again
  if (c.s.dealOffered && !explicit) return;
  c.s.thanked = true;
  if (!once(c, "thanks")) return;
  if (stepIs(c, "nora") || /\b(natalia|nata|naty)\b/.test(heard(c))) { if (!c.s.noraHi) { c.s.noraHi = true; nora(c, "nora_hi"); } return; }
  // ("¡Ay, ya cállate! Entra." would end the visit before "¿Borrón y cuenta nueva o qué?")
  if (stepIs(c, "start_over")) { if (!c.s.anytimeSaid) { c.s.anytimeSaid = true; dan(c, "anytime_wait"); } if (!c.s.offerStart) offerStart(c); return; }
  c.s.anytimeSaid = true;
  dan(c, "anytime_wait");
}

/** The last word after "Pásale": "¡Ay, ya cállate! Entra." (or "Sí. Yo también."). */
function closeOut(c: Ctx) {
  if (!c.s.closed) {
    c.s.closed = true;
    const h = heard(c);
    if (/\bgracias\b/.test(h)) c.s.thanked = true;
    dan(c, /\b(extran|eche de menos|echado de menos)/.test(h) && !c.s.missedSaid ? "me_too" : "hush");
  }
  c.end();
  c.hold();
}

/** A bare yes/no answers Diego's open question, whichever step is current: the price ("¿Y? ¿Trato hecho?"), "¿Borrón
 *  y cuenta nueva o qué?" or "Necesito tiempo". Returns false if no such question is open. */
function openYesNo(c: Ctx, yes: boolean): boolean {
  if (c.s.dealOffered) { if (yes) acceptDeal(c); else dealNo(c); return true; }
  if (c.s.offerStart && !c.s.startOverDone) { if (yes) doStartOver(c, false); else startNo(c); return true; }
  if (timeOpen(c)) { if (yes) acceptTime(c); else pushMove(c); return true; }
  return false;
}
/** "No" to his price: "Respuesta equivocada…" once (a joke between friends); a second "No" he lets go ("Bueno, ya. Con
 *  la disculpa me conformo."). It used to say "Respuesta equivocada" for ever. */
function dealNo(c: Ctx) {
  if (!once(c, "deal_no")) return;
  c.s.dealNos = (c.s.dealNos ?? 0) + 1;
  if (c.s.dealNos >= 2) { if (once(c, "deal")) { dan(c, "deal_let_go"); settle(c); } return; }
  react(c, "wrong_answer");
  askDeal(c);
}
/** "No" to "¿Borrón y cuenta nueva o qué?": the joke once, then "Está bien. Poco a poco, entonces." */
function startNo(c: Ctx) {
  if (!once(c, "start_no")) return;
  c.s.startNos = (c.s.startNos ?? 0) + 1;
  if (c.s.startNos >= 2) { c.s.startOverDone = true; dan(c, "slow_start"); return; }
  react(c, "wrong_answer");
  c.hold();
}

function stepYes(c: Ctx) {
  const st = startOver.steps.find((x) => x.id === c.step);
  if (st?.yes && !st.done(c)) st.yes(c);
}

// ---------------------------------------------------------------------------
// Handlers

const HANDLERS: Record<string, H> = {
  voc_unknown(c) { greet(c); },
  its_me(c) { greet(c); },
  g_hello(c) { greet(c); },
  hi_nora(c) { greet(c); },
  long_time(c) {
    if (c.s.goalMet || c.s.talkOpen || c.s.longSaid) return;
    c.s.longSaid = true;
    dan(c, "long_time_react"); dan(c, "market_joke");
    c.hold();
  },
  i_know(c, sl, sg) { HANDLERS.long_time(c, sl, sg); },
  ask_how(c, _sl, seg) {
    if (c.s.goalMet) return;
    if (once(c, "how")) dan(c, seg.tags.includes("nora") ? "how_nora" : seg.tags.includes("cat") ? "how_cat" : seg.tags.includes("boat") ? "how_boat" : seg.tags.includes("here") ? "how_here" : "how_been");
    if (!c.s.talkOpen) c.hold(); // Diego waits for the real reason; later, "No viniste hasta aquí a hablar del clima."
  },
  g_howareyou(c) { HANDLERS.ask_how(c, {}, NOSEG); },
  can_talk(c) {
    if (c.s.goalMet || now(c, "bad")) return;
    // "No vine a pelear." / "¿Podemos hablar?" once he is already listening: he listens (not "…hablar del clima")
    if (c.s.talkOpen && !c.s.apologyDone) { c.s.listenSaid = true; react(c, "listening"); c.hold(); return; }
    c.s.talkOpen = true;
  },
  // "¿Sigues enojado?": "¿Tú qué crees?" before he has had his say; "No. Ya se me pasó." after it
  still_mad(c) {
    if (c.s.goalMet) return;
    if (timeOpen(c)) { react(c, "just_time"); c.hold(); return; }
    if (c.s.turnDone) { react(c, "not_mad"); return; }
    react(c, "mad_q");
    c.hold();
  },
  come_in(c) {
    if (c.s.goalMet || c.s.turnDone) return;
    c.s.talkOpen = true;
    react(c, "porch");
  },
  apologize(c, _sl, seg) {
    // "¿Perdón?" asks to repeat
    if (PARDON_Q.test(heard(c))) { GLOBAL_HANDLERS.g_repeat(c as any, {}); return; }
    if (/^\W*(disculpa|ups|oops)\W*$/.test(heard(c))) c.tip(TIPS.too_light);
    apologyMove(c, seg.tags);
  },
  // a bare "Perdón." apologizes here; "¿Perdón?" still asks to repeat
  g_repeat(c) {
    const h = heard(c);
    if (!c.s.goalMet && !c.s.apologyDone && /^\W*(perdon|perdoname)\W*$/.test(h) && !/\?/.test(c.heard)) { apologyMove(c, []); return; }
    // "Lo siento otra vez." / "Perdóname de nuevo.": apologizing again, not "say that again" (it got "Sin problema."
    // and his last lines once more); "Lo siento, ¿lo puedes repetir?" still asks to repeat
    if (!c.s.goalMet && /\b(lo siento|perdoname|disculpame)\b/.test(h) && /\b(otra vez|de nuevo|una vez mas)\b/.test(h)
      && !/\b(repet|repit|decir|dijiste|dices|oi|escuche|entendi)/.test(h)) { apologyMove(c, []); return; }
    GLOBAL_HANDLERS.g_repeat(c as any, {});
  },
  g_sorry(c) {
    const h = heard(c);
    // "Me equivoqué", "Fue mi error": owning it
    if (/\b(me equivoque|fue mi error)\b/.test(h)) { HANDLERS.own_it(c, {}, NOSEG); return; }
    if (/\b(ups|oops)\b/.test(h)) c.tip(TIPS.too_light);
    apologyMove(c, []);
  },
  apology_detail(c, _sl, seg) {
    if (c.s.goalMet) return;
    c.s.talkOpen = true;
    if (seg.tags.includes("silence")) c.s.silenceNamed = true;
    if (timeOpen(c)) { react(c, "heard_you"); c.hold(); return; }
    if (!c.s.apologyDone) { c.s.apologyDone = true; mark(c, "ap_now"); return; }
    if (!now(c, "ap_now") && !c.s.turnDone) react(c, "heard_you");
  },
  own_it(c, _sl, seg) {
    if (c.s.goalMet) return;
    c.s.talkOpen = true;
    if (/\bme equivoque\b/.test(heard(c))) c.s.saidWrong = true;
    if (timeOpen(c)) { react(c, "heard_you"); c.hold(); return; }
    if (c.s.turnDone) { react(c, "heard_you"); return; }
    if (!c.s.apologyDone) { c.s.apologyDone = true; mark(c, "ap_now"); }
    if (seg.tags.includes("why")) answerWhy(c, seg.tags.includes("pride"));
    if (c.s.ownDone) { if (!now(c, "own_now") && !now(c, "say:pride_coat") && !now(c, "say:know_that")) react(c, "heard_you"); return; }
    c.s.ownDone = true;
    mark(c, "own_now");
  },
  why_silent(c, _sl, seg) {
    if (c.s.goalMet) return;
    c.s.talkOpen = true;
    if (timeOpen(c)) { react(c, "heard_you"); c.hold(); return; }
    if (c.s.turnDone) { react(c, "ack"); return; }
    answerWhy(c, seg.tags.includes("pride"));
  },
  sorry_but(c) { badMove(c, "sorry_but"); },
  true_ctx(c, sl, sg) { if (stepIs(c, "responsibility")) HANDLERS.own_it(c, sl, sg); },
  dunno_why_ctx(c) {
    if (c.s.goalMet || !stepIs(c, "responsibility")) return;
    startOver.steps.find((x) => x.id === "responsibility")?.help?.(c);
  },
  // "¿Algo más que quieras decir?" – "Nada, gracias." (only then)
  nothing_else_ctx(c) {
    if (c.s.goalMet || !stepIs(c, "start_over") || !once(c, "nothing")) return;
    offerStart(c);
  },
  excuse(c) { badMove(c, "excuse"); },
  blame(c) { badMove(c, "blame"); },
  rude(c) { badMove(c, "rude"); },
  didnt_mean(c) { badMove(c, "didnt_mean"); },
  push(c) { if (timeOpen(c)) pushMove(c); else badMove(c, "push"); },
  accept_time(c, _sl, seg) {
    if (c.s.goalMet) return;
    if (timeOpen(c)) { acceptTime(c); return; }
    // "Bueno, me voy." with no time asked for: leaving
    if (seg.tags.includes("leave")) HANDLERS.g_bye(c, {}, NOSEG);
  },
  time_q(c) { if (timeOpen(c)) { react(c, "time_q_react"); c.hold(); } },
  make_up_q(c) {
    if (c.s.goalMet) return;
    if (timeOpen(c)) { react(c, "just_time"); c.hold(); return; }
    if (!c.s.turnDone) { react(c, "too_soon"); c.hold(); return; }
    if (!once(c, "price")) return;
    if (c.s.dealOffered) { sayPrice(c); askDeal(c); return; }
    if (c.s.makeUpDone) { sayPrice(c); c.hold(); return; }
    offerPrice(c, false);
  },
  offer(c) {
    if (c.s.goalMet) return;
    if (timeOpen(c)) { react(c, "just_time"); c.hold(); return; }
    if (!c.s.turnDone) { react(c, "too_soon"); c.hold(); return; }
    if (!once(c, "offer")) return;
    dan(c, "offer_react");
    if (!c.s.makeUpDone) settle(c);
  },
  offer_ctx(c, sl, sg) { if (!c.s.dealOffered) HANDLERS.offer(c, sl, sg); },
  deal_ctx(c) {
    if (c.s.goalMet) return;
    // "El sábado no puedo.": not a yes (cant_now_ctx answers it)
    if (c.s.dealOffered) { if (!/\bno puedo\b/.test(heard(c))) acceptDeal(c); return; }
    // "¿Y ahora qué?" – "Lo que tú quieras." / "Tú dime.": he names his price (it used to ask "¿Y ahora qué sigue?" again)
    if (stepIs(c, "make_up") && c.s.turnDone && !c.s.makeUpDone && !timeOpen(c) && once(c, "price")) offerPrice(c, false);
  },
  // "Podrías empezar por quedarte a comer." – "Hoy no puedo.": "Bueno, otro día. Pero me la debes."
  cant_now_ctx(c) {
    if (c.s.goalMet || !c.s.dealOffered || !once(c, "deal")) return;
    dan(c, "deal_later");
    settle(c);
  },
  // "Y cocinas tú." – "¿Qué quieres que cocine?": "Sorpréndeme." (asked about the dinner he named, it agrees to it)
  what_cook(c) {
    if (c.s.goalMet) return;
    if (timeOpen(c)) { react(c, "just_time"); c.hold(); return; }
    if (!c.s.turnDone) { react(c, "too_soon"); c.hold(); return; }
    react(c, "surprise_me");
    if (c.s.dealOffered && c.s.variant === "dinner") { if (once(c, "deal")) settle(c); return; }
    if (c.s.dealOffered) askDeal(c);
  },
  cant_cook(c, _sl, seg) {
    if (c.s.goalMet) return;
    // "No sé cocinar" to the dinner, "No sé nada de lanchas" to the lancha: "Ya lo sé. Ese es el castigo."
    const fits = seg.tags.includes("boat") ? c.s.variant === "boat" : c.s.variant === "dinner";
    if (c.s.dealOffered && fits) { if (once(c, "deal")) { dan(c, "cant_cook_react"); settle(c); } return; }
    if (c.s.dealOffered) { react(c, "wrong_answer"); askDeal(c); return; }
    react(c, "ack");
  },
  promise(c) {
    if (c.s.goalMet) return;
    if (timeOpen(c)) { react(c, "heard_you"); c.hold(); return; }
    if (c.s.dealOffered && /\b(prometo|mi palabra)\b/.test(heard(c))) { acceptDeal(c); return; }
    if (!c.s.apologyDone) { react(c, "too_soon"); c.hold(); return; }
    if (!once(c, "promise")) return;
    dan(c, "promise_react");
    if (stepIs(c, "start_over") && !c.s.offerStart) { offerStart(c); return; }
    if (!c.s.turnDone) c.hold();
  },
  start_over(c, _sl, seg) {
    if (c.s.goalMet) return;
    // A bare "Está bien." is read like "Estamos bien": it is a plain yes (it was "No me presiones" while Diego needed
    // time, and "¿Y? ¿Trato hecho?" again at his price); at "¿Algo más que quieras decir?" it means nothing more
    if (BARE_OK.test(heard(c))) {
      if (stepIs(c, "start_over") && !c.s.offerStart && !c.s.startOverDone && !c.s.dealOffered) { offerStart(c); return; }
      HANDLERS.g_ok(c, {}, NOSEG);
      return;
    }
    if (timeOpen(c)) { pushMove(c); return; }
    if (!c.s.turnDone) { react(c, "too_soon"); c.hold(); return; }
    if (!once(c, "start")) return;
    if (!c.s.makeUpDone) {
      // "Tal vez. Pero primero me debes una cena." (the price first; a yes answers both)
      c.s.startPending = true;
      if (c.s.dealOffered) { dan(c, "deal_q"); askDeal(c); return; }
      c.s.variant = "dinner";
      c.s.dealOffered = true;
      dan(c, "start_over_early"); dan(c, "make_up_more");
      askDeal(c);
      return;
    }
    doStartOver(c, seg.tags.includes("friends"));
  },
  missed_you(c) {
    if (c.s.goalMet) return;
    if (!c.s.turnDone) { react(c, "missed_early"); c.hold(); return; }
    if (!once(c, "missed")) return;
    if (!c.s.noraHi && (stepIs(c, "nora") || (c.s.noraDone && /\b(los|os|ustedes|a los dos|natalia)\b/.test(heard(c))))) { c.s.noraHi = true; nora(c, "nora_hi"); return; }
    if (!c.s.missedSaid) { c.s.missedSaid = true; dan(c, "me_too"); } else react(c, "ack");
    if (stepIs(c, "start_over") && !c.s.offerStart) offerStart(c);
  },
  thanks_hearing(c) { thanks(c, true); },
  g_thanks(c) { thanks(c, false); },
  thanks_mate(c) { thanks(c, false); },
  g_ok(c) { if (!openYesNo(c, true)) stepYes(c); },
  g_bye(c) {
    if (c.s.goalMet) { closeOut(c); return; }
    // "Igualmente" / "Tú también" after Natalia's "¡Qué gusto verte!" is no goodbye (see NEEDS)
    if (/^\W*(igualmente|tu tambien|usted tambien)\W*$/.test(heard(c))) {
      if (c.s.noraDone && !c.s.noraHi) c.s.noraHi = true;
      react(c, "ack");
      c.hold();
      return;
    }
    // "Dime y me voy" while Diego needs time is the graceful exit: the twist
    if (timeOpen(c)) { acceptTime(c); return; }
    if (once(c, "bye")) {
      if (!c.s.apologyDone) {
        c.s.left = "early";
        dan(c, "leave_early");
        c.event("outro", { outcome: "early", lt: c.player.gender === "f" ? OUTRO.early.f : OUTRO.early.m });
      } else {
        c.s.left = "partial";
        dan(c, "leave_partial"); dan(c, "call_me");
        c.remember({ danApologized: true });
        c.event("outro", { outcome: "partial", lt: OUTRO.partial });
      }
    }
    c.end();
    c.hold();
  },
};
startOver.handlers = HANDLERS;

export default startOver;
