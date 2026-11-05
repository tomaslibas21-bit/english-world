// Advanced song P28 "Taste It Again" → Puerto Colibrí: "Pruébalo otra vez" (B2–C1): giving and taking feedback in the
// kitchen of El Muelle, the marisquería on the malecón (palapa roof; s62, s69). An hour before the evening service. The
// learner, a cook from an English-speaking country, wants a fish chowder "como en mi tierra" on the specials board (el
// pizarrón). Chef Villanueva tastes it ("¿Un chowder? ¿Con este calor?"), asks "¿Te puedo hacer unos comentarios?" and
// gives it the song's way: what worked (the fish, just right; so creamy), then one thing to try (a little more acidity:
// "le falta vida"). The learner takes it ("Gracias, me sirve mucho. Lo voy a mejorar."), asks for an example (lime, a
// splash of white wine), has him taste it again ("¡Así sí!"), and answers his second idea, the plating (el emplatado):
// fried tortilla strips on top. The learner agrees, or politely keeps their own way (crackers on the side, as back home).
// Then a favor: Fátima, the new junior cook, made the ceviche; "como acabo de hacer contigo". The learner offers
// feedback, says what worked (el pescado, el aguacate…), suggests one thing to try ("le falta una pizca de sal", "está
// muy picante: quítale las semillas al chile"; Fátima may ask "¿cuánto?") and encourages her ("Ya lo vas a lograr").
// Twist (25 % on the first visit, 60 % later, as in the English): Fátima turns the song around: "unas gotitas de habanero".
//
// Built on the English edition's p28: the same steps, intents, handlers, mission and twist. What changed for Mexico: the
// dishes (a chowder and a ceviche), the second idea (tortilla strips instead of croutons), the crackers instead of hot
// potatoes, Monterrey for Ohio, "¿Me explico?" / "¿Alguna duda?", "¡Así sí!".
//
// Address: the brief says tú. Both cooks say tú to the learner (written in their lines; the chef's shared cast entry is
// not `informal`, so the global lines that switch {u:|t:} are copied below in tú, as the English file does). The learner's
// hints to the head chef use usted (Mexican kitchens often show the chef that respect, and the shared hint groups use
// usted for him anyway); tú to him is understood with no tip. Fátima: tú both ways. "Los dos / las dos" in the closing
// follows the learner's gender (Fátima is a woman).
//
// Facts kept vague: the opening hour ("en una hora empieza el servicio", no clock time: s69 has El Muelle open "desde
// temprano", busiest at sunset). The dishes are general Mexican coastal cooking (ceviche with lime, onion, cilantro,
// avocado; tortilla strips as a garnish), nothing priced.
//
// NEEDS: (1) the events "taste" and "enter" (as in the English file) have no effect in the game yet. (2) An NPC flag for
// "says tú to the learner" apart from "the learner says usted to them" would let the copied global lines go. (3) global.ts
// g_thanks lacks "gracias por lo de hoy" (thanks_today here). (4) global.ts g_meaning takes one word after "¿Qué
// significa…?": "¿Qué significa «en su punto»?" / "«con tacto»?" isn't understood (the chef's acidez / le falta vida are
// answered here by his example).
//
// Audit (5 Nov 2026): side questions answered ("¿Le gustó?", the board, "¿Cuánto le pongo?", "¿Quién es Fátima?",
// "¿Qué lleva?", "¿En serio?"), no line twice in a row, and two sims that make each cook say the shared replies in
// their own voice (docs/es/reviews/p28-kitchen.md).

import type { Ctx, EntityDef, Segment, SituationDef, Tip } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_LIME = "In Mexico limón is the small green lime.";
const F_TE = "te: “for you”; quedar / salir (a dish) = turn out.";
const F_RICO = "rico: tasty, delicious (of food).";
const F_USTED = "Cooks often answer the head chef with usted; tú is fine too.";

// ---------------------------------------------------------------------------
// Entities: what worked in Fátima's ceviche (good_part) and one thing to try (ingredient).
// attrs: odd = unusual in a ceviche (Fátima is surprised); bought = not made by her (tostadas, crackers).

const LIMON = ent("limon", "limón", "lime", "m", { art: "", chip: "limón", attrs: { food: true }, forms: ["limon", "limones", "jugo de limon", "el jugo de limon", "lima", "limas", "el jugo"] });
const CILANTRO = ent("cilantro", "cilantro", "cilantro", "m", { art: "", chip: "cilantro", attrs: { food: true }, forms: ["culantro", "coriandro"] });
const CEBOLLA = ent("cebolla", "cebolla", "onion", "f", { art: "", chip: "cebolla", attrs: { food: true }, forms: ["cebolla morada", "cebolla roja", "cebollita", "cebollas"] });
const AGUACATE = ent("aguacate", "aguacate", "avocado", "m", { art: "", chip: "aguacate", attrs: { food: true }, forms: ["aguacates", "palta"] });
const PEPINO = ent("pepino", "pepino", "cucumber", "m", { art: "", chip: "pepino", attrs: { food: true }, forms: ["pepinos", "pepinito"] });
const MANGO = ent("mango", "mango", "mango", "m", { art: "", chip: "mango", attrs: { food: true }, forms: ["mangos", "mango manila"] });

const GOOD_PARTS: EntityDef[] = [
  ent("pescado", "pescado", "fish", "m", { chip: "pescado", attrs: { food: true }, forms: ["pescado blanco", "pescado fresco", "la pesca", "el pescadito"] }),
  ent("camaron", "camarón", "shrimp", "m", { pl: "camarones", ltPl: "shrimp", chip: "camarón", attrs: { food: true }, forms: ["camarones", "camaroncito", "camaroncitos"] }),
  LIMON, CEBOLLA, CILANTRO, AGUACATE,
  ent("tomate", "tomate", "tomato", "m", { chip: "tomate", attrs: { food: true }, forms: ["jitomate", "jitomates", "tomates"] }),
  PEPINO, MANGO,
  ent("sabor", "sabor", "flavor", "m", { chip: "sabor", forms: ["el gusto", "la sazon", "el sazon", "los sabores"] }),
  ent("color", "color", "color", "m", { chip: "color", attrs: { looks: true }, forms: ["colores", "los colores"] }),
  ent("textura", "textura", "texture", "f", { chip: "textura", forms: ["consistencia", "el punto"] }),
  ent("picante", "picante", "heat", "m", { chip: "picante", forms: ["lo picante", "el picor", "el chile", "el habanero"] }),
  ent("presentacion", "presentación", "presentation", "f", { chip: "presentación", attrs: { looks: true }, forms: ["presentacion", "el emplatado", "emplatado"] }),
];

const INGREDIENTS: EntityDef[] = [
  ent("sal", "sal", "salt", "f", { art: "", chip: "sal", forms: ["sal de grano", "sal de mar", "sal fina", "salecita"] }),
  LIMON,
  ent("pimienta", "pimienta", "pepper", "f", { art: "", chip: "pimienta", forms: ["pimienta negra", "pimienta molida"] }),
  CILANTRO, CEBOLLA,
  ent("ajo", "ajo", "garlic", "m", { art: "", chip: "ajo", forms: ["ajos", "un diente de ajo", "ajito"] }),
  AGUACATE, PEPINO, MANGO,
  ent("habanero", "chile | habanero", "chili | habanero", "m", { art: "", chip: "chile habanero", attrs: { nat: "habanero pepper" },
    forms: ["habanero", "chile", "chilito", "salsa de habanero", "habaneros"] }),
  ent("serrano", "chile | serrano", "chili | serrano", "m", { art: "", chip: "chile serrano", attrs: { nat: "serrano pepper" }, forms: ["serrano", "serranos"] }),
  ent("naranja", "naranja", "orange", "f", { art: "", chip: "naranja", forms: ["jugo de naranja", "naranja agria", "jugo de naranja agria", "naranjas"] }),
  ent("oregano", "orégano", "oregano", "m", { art: "", chip: "orégano", forms: ["oregano"] }),
  ent("aceite", "aceite | de | oliva", "oil | of | olive", "m", { art: "", chip: "aceite de oliva", attrs: { nat: "olive oil" }, forms: ["aceite", "aceite de oliva", "aceitito"] }),
  ent("salsa_inglesa", "salsa | inglesa", "sauce | Worcestershire", "f", { art: "", chip: "salsa inglesa", attrs: { nat: "Worcestershire sauce" },
    forms: ["salsa inglesa", "salsa maggi", "jugo maggi", "salsa worcestershire"] }),
  ent("jengibre", "jengibre", "ginger", "m", { art: "", chip: "jengibre", attrs: { odd: true } }),
  ent("coco", "leche | de | coco", "milk | of | coconut", "f", { art: "", chip: "leche de coco", attrs: { odd: true, nat: "coconut milk" }, forms: ["leche de coco", "coco"] }),
];
/** Foods that are not in the ceviche: "Me gustan las tostadas." – "¿Tostadas? ¡Esas son de la tienda!" */
const OTHER_FOODS: EntityDef[] = [
  ent("tostadas", "tostadas", "tostadas", "f", { attrs: { bought: true }, forms: ["tostada", "las tostadas"] }),
  ent("galletas", "galletas", "crackers", "f", { attrs: { bought: true }, forms: ["galletas saladas", "galleta", "galletitas"] }),
  ent("pan", "pan", "bread", "m", { forms: ["pancito", "el pan"] }),
  ent("arroz", "arroz", "rice", "m"),
  ent("papas", "papas", "potatoes", "f", { forms: ["papa", "las papas"] }),
  ent("frijoles", "frijoles", "beans", "m", { forms: ["frijol", "los frijoles"] }),
  ent("queso", "queso", "cheese", "m"),
];
const ingredient = (id?: string) => INGREDIENTS.find((e) => e.id === id);
const other = (id?: string) => OTHER_FOODS.find((e) => e.id === id);

// ---------------------------------------------------------------------------
// Speakers and per-turn helpers

/** The chef (tú to the learner) and Fátima (tú). */
const C = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("whitaker"); c.say(line, vars); };
const M = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("russo"); c.say(line, vars); };

// One reaction per learner turn: "Gracias, me sirve mucho. Lo voy a mejorar." is two pieces but one answer.
const SAID = new WeakMap<Ctx, Set<string>>();
function once(c: Ctx, key: string): boolean {
  let set = SAID.get(c);
  if (!set) { set = new Set(); SAID.set(c, set); }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}

// Answers that wait for the end of the turn (the step's question settles them), so a later piece wins: a "no, pero…"
// to the favor ("Estoy ocupado, pero va, lo hago") and a "No sé" before an answer ("No sé. ¿Tal vez cilantro?").
const NO_LATER = new WeakSet<Ctx>();
const SURPRISE = new WeakSet<Ctx>();
const DONT_KNOW = new WeakMap<Ctx, string>();
const asks = (c: Ctx, id: string): number => c.s.asks?.[id] ?? 0;
function bump(c: Ctx, id: string): number { c.s.asks ||= {}; c.s.asks[id] = asks(c, id) + 1; return c.s.asks[id]; }
const fold = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const heard = (c: Ctx) => fold(c.heard);

/** "No sé, me gusta…": a hesitation before praise, never "no me gusta". */
const NO_SE_LIKE = /\bno se\b[\s.,…]*(pero\s+)?me (gusta|gustan|gusto|encanta|encantan|encanto)\b/;
const MIA_STEPS = new Set(["mia_open", "mia_worked", "mia_try", "mia_howmuch", "mia_encourage", "mia_back"]);
const inMia = (c: Ctx) => !!c.step && MIA_STEPS.has(c.step);
/** A polite no to an idea ("No, gracias", "Así está bien", "Mejor así"): keeping one's own way, not a rude one. */
const POLITE_NO = /\b(gracias|asi|prefiero|mejor|como esta)\b/;
const receiveDone = (c: Ctx) => !!c.s.received || (c.s.defCount ?? 0) >= 2 || !!c.s.recvSkip;
const praiseDone = (c: Ctx) => !!c.s.praised || !!c.s.praiseSkip;
const tryDone = (c: Ctx) => !!c.s.tried || !!c.s.trySkip;
const encDone = (c: Ctx) => !!c.s.encouraged || !!c.s.encSkip;
/** Items 2, 5, 6 and 7: what the course report needs. */
const coreDone = (c: Ctx) => !!c.s.received && !!c.s.praised && !!c.s.tried && !!c.s.encouraged;

/** Sims: the core scene (no "¿cuánto?" question unless pinned, no twist). */
const PLAIN = (s: Record<string, any>) => { s.howMuch = false; s.backTwist = false; };
const AUTO: Record<string, string> = {
  mia_howmuch: "Nada más un poquito.", mia_back: "Gracias, Fátima. Me sirve mucho.", closing: "¡Gracias por lo de hoy, chef!",
};

// ---------------------------------------------------------------------------

export const kitchen: SituationDef = {
  id: "p28-kitchen",
  song: "P28",
  songTitle: "Taste It Again",
  title: { en: "Pruébalo otra vez", lt: "Taste It Again" },
  topic: { en: "Dar y recibir comentarios", lt: "Giving and receiving feedback" },
  chapter: 8,
  order: 4,
  location: "the-pier",
  npc: "whitaker",
  npcs: ["russo"],
  goal: "Take the head chef's feedback well, then give the new cook kind, useful feedback on her dish.",
  intro: "The kitchen of El Muelle, an hour before the evening service. You want your fish chowder, the way they make it back home, on tonight's specials board, but first Chef Villanueva has to taste it. He's calm, and he misses nothing. Afterwards he may ask you to help Fátima, the new junior cook. In this kitchen everyone says tú to you.",
  entities: { good_part: GOOD_PARTS, ingredient: INGREDIENTS, other_food: OTHER_FOODS },

  grammar: {
    macros: {
      chef: "(chef | chef villanueva | villanueva | jefe)",
      fa: "(fatima | fati)",
      sopa: "(chowder | chowder de pescado | crema | crema de pescado | crema de almejas | crema de mariscos | sopa | sopa de pescado | clam chowder | plato | platillo | receta | especial)",
      probar: "(probar | probarlo | probarla | darle una probada | echarle una probada)",
      fb: "(comentarios | comentario | opinion | opinion honesta | retroalimentacion | feedback | observaciones | sugerencias | consejos | critica | criticas)",
      ceviche: "(ceviche | ceviche de pescado | ceviche de camaron | plato | platillo)",
      poco: [
        "(un poco de | un poquito de | un poquitito de | poquito de | tantito | un tantito de | tantito de | mas | un poco mas de | un poquito mas de | algo de | unas gotas de | unas gotitas de | un chorrito de | un toque de | otro poco de | mas de)",
        "(una pizca de | un pellizco de | una cucharadita de | una cucharada de | media cucharadita de) #amt",
      ],
      acido: "(limon | jugo de limon | limones | vinagre | vino blanco | un vino blanco | vino | lima | naranja agria | algo acido | acidez | acido | mas acidez | algo agrio)",
      sal: "(sal | mas sal | sal de grano | sal de mar)",
      cruj: "(tiritas de tortilla | tiras de tortilla | tortilla | tortillas | tortilla frita | tiritas | totopos | algo crujiente | crujiente | lo crujiente | las tiritas | la tortilla | las tortillas)",
      galletas: "(galletas | galletas saladas | galletitas | pan | pan negro | pan tostado | crackers)",
      bueno: "(buenisimo | buenisima | bueno | buena | rico | rica | riquisimo | riquisima | delicioso | deliciosa | perfecto | perfecta | excelente | increible | sabroso | sabrosa | fresco | fresca | fresquisimo | fresquisima | espectacular | muy bueno | muy buena | muy rico | muy rica | buenazo | padre)",
      first: "(al principio | al inicio | en mi primera semana | cuando empecé | cuando empece | en mi primer dia | mi primer dia | la primera semana)",
      fixnp: "{fix:ingredient}",
      art: "[el | la | los | las | tu | tus]",
      ocupado: "(ocupado | ocupada | ocupadisimo | ocupadisima | apurado | apurada)",
    },
  },

  intents: {
    // --- the chef: serving the chowder ---------------------------------------------------
    offer_taste: { patterns: [
      "[chef] (puede | podria | puedes | podrias | quiere | quieres) @probar [mi @sopa | la @sopa | esto | este @sopa] [chef] #h:could_taste",
      "(lo | la) (puede | podria | puedes | podrias) probar [chef]",
      "(le | te) importaria @probar [mi @sopa] #h:would_mind",
      "me (encantaria | gustaria) (saber | escuchar | conocer | tener) (su | tu) (opinion | @fb) [sobre (mi @sopa | esto)] #h:love_feedback #fb",
      "(aqui (esta | tiene | tienes) | le presento | te presento | este es | esta es | le traigo | te traigo) [mi] @sopa [chef] #h:heres_soup",
      "(aqui (esta | tiene | tienes) | tenga | ten) [chef]",
      "[ya] (esta | quedó | quedo) (listo | lista) [mi @sopa | el @sopa | la @sopa] [para probar] [chef] #h:its_ready",
      "[ya] (estoy | estamos) (listo | lista | listos) [para la prueba]",
      "(hice | preparé | prepare | cociné | cocine) (un | una | mi | el | la | este | esta)? @sopa [de pescado] [como en mi (casa | pais | tierra) | de mi (pais | tierra)] [para (el pizarron | la pizarra | los especiales | hoy | el menu | usted | ti | esta noche)]",
      "(hice | preparé | prepare) algo [nuevo] [para (usted | ti | los especiales | hoy | el menu)]",
      "(quiero | quisiera | me gustaria) (poner | meter | agregar | apuntar) (mi @sopa | el @sopa | la @sopa | esto | lo | la) (en | a) (el pizarron | la pizarra | los especiales | el menu | la carta) [de hoy]",
      "(es | este es | esta es) (un | una | mi)? @sopa [de mi pais | de mi tierra | como en mi pais]",
      "(es | esta es) una receta (de mi pais | de mi familia | de mi abuela | de mi tierra | tradicional)",
      "(esta | es) (bastante | lo suficientemente)? (bueno | buena) para (el pizarron | la pizarra | los especiales | hoy | el menu) #fb",
      "(que | como) (le | te) (parece | late | sabe) [mi @sopa | el @sopa | la @sopa] [chef] #h:what_think #fb",
      "(que opina | que opinas | que piensa | que piensas) [de (mi @sopa | esto)] #fb",
      "(me | nos) (puede | puedes | podria | podrias) (dar | decir | hacer) (su | tu | unos | algunos | sus | tus) (@fb | opinion) [sobre (mi @sopa | esto)] #fb",
      "(quiero | quisiera | necesito) (su | tu | unos | sus | tus) @fb #fb",
      "(digame | dime) que (piensa | piensas | opina | opinas | le parece | te parece) #fb",
      "(tiene | tienes) un (minuto | momento | segundo | minutito | segundito)",
      "(tiene | tienes) (tiempo | un momento | un minuto) para (probar algo | probarlo | probar)", "(es | esto es) para (el especial | los especiales | el pizarron | la pizarra) [de hoy]",
      "(puede | podria | puedes | podrias) (darme | decirme) (su | tu) (opinion | @fb)", "(tengo | traigo) algo para (usted | ti)",
      "(tengo | traigo) algo (para que lo pruebe | para que lo pruebes | que mostrarle | que mostrarte)",
      "espero que (le | te) guste",
      "(pruebelo | pruebalo | pruebela | pruebala | pruebe | prueba | pruebe esto | prueba esto) [chef] #tip:bossy",
      "(tiene | tienes) que (probarlo | probarla | probar esto) #tip:bossy",
      "(puede | puedes) (probarlo | probarla | probar) [si (quiere | quieres)]",
      "(le | te) (traigo | traje) (mi @sopa | algo | un @sopa)",
      "(ten | tenga) (pruebalo | pruebelo | prueba | pruebe)",
      "[chef] (lo | la) (prueba | pruebas | probaria | probarias) [chef]", "(quiero | quisiera | me gustaria) que (lo | la) (pruebe | pruebes | probara | probaras) [chef]",
      "(me da | me das | me dice | me dices) (su | tu) (opinion | @fb) [chef] #fb", "me (hace | haces) el favor de @probar [mi @sopa]",
      "(esta | quedó | quedo) (bueno | rico | bien) [mi @sopa | el @sopa] [chef] #fb",
    ] },
    nervous: { patterns: [
      "(estoy | ando | me siento) [un poco | un poquito | muy | bastante | super] (nervioso | nerviosa | asustado | asustada | preocupado | preocupada | estresado | estresada) [por (esto | la prueba)] #h:nervous",
      "no se ria [de mi] #h:dont_laugh", "no te rias [de mi]", "no (sea | seas) (duro | dura | malo | mala | cruel) [conmigo]",
      "me (pongo | pone) (nervioso | nerviosa)", "(me da | me dan) (nervios | pena | miedo)",
      "(sea | se) (bueno | amable | suave) conmigo",
      "no (se | sé) si (esta | quedó | quedo) (bueno | buena | bien | rico | rica)", "espero que (este | quede) (bueno | buena | bien | rico)",
      "todavia no (esta | está) (listo | lista)", "no (lo | la) (pruebe | pruebes) todavia", "todavia no (lo | la) (pruebe | pruebes)",
      "no quiero que (lo | la) (pruebe | pruebes) [todavia]", "(mi @sopa | el @sopa) no (esta | está) (listo | lista) [todavia]",
      "no (esta | está) (listo | lista) [todavia]", "todavia no (esta | quedó | quedo) (mejor | bien) #notyet", "no (esta | quedó | quedo) (mejor | bien) todavia #notyet", "no (esta | quedó | quedo) mejor #notyet",
    ] },
    want_feedback: { patterns: [
      "(claro | si | por supuesto | adelante | sale | va | vale | ok | dale | bueno) [chef] (digame | dime | adelante) #h:sure_go_ahead",
      "(digame | dime | adelante | soy todo oidos | soy toda oidos | lo escucho | te escucho | le escucho)",
      "[claro | por supuesto | si] (sea | se) (honesto | sincero | franco) [conmigo] [chef] #h:be_honest",
      "[si | claro] me encantaria (escuchar | oir | saber) (sus | tus | unos) (@fb | opinion) #h:love_some",
      "(me encantaria | quiero | me gustaria) (escuchar | oir | saber) (su | tu | sus | tus) (opinion | @fb | lo que piensa | lo que piensas)",
      "[si | claro] (me encantaria | quiero | me gustaria) saber (que | lo que) (opina | opinas | piensa | piensas) [@chef]",
      "(digamelo | dimelo) (sin rodeos | directo | tal cual | sin pena) #h:can_take",
      "(aguanto | puedo con eso | lo aguanto | aguanto todo | aguanto vara) [digame | dime]",
      "para eso (estoy | vine) [aqui]",
      "(quiero | necesito) (sus | tus | unos) (comentarios | opinion | sugerencias | consejos)",
      "(claro | si | por supuesto) (puede | puedes)",
      "(se lo | te lo) agradeceria",
      "(sea | se) (duro | brutal) [conmigo]",
      "[si] (me encantaria | con gusto | con mucho gusto | orale | claro que si) [chef]", "(claro | si) (digame | dime) (que piensa | que piensas | sin miedo)",
      "[si | claro] (digame | dime) (lo que | que) (piensa | piensas | opina | opinas)",
      "(si | claro | ok | bueno | va | sale) pero (rapido | rapidito | breve | cortito)",
    ] },
    // "¿Le gustó?" / "¿Qué le pareció?": before the feedback it asks for it; after it, the chef answers
    ask_liked: { patterns: [
      "[entonces | o sea que | pero] (le | te) (gustó | gusta) [mi @sopa | el @sopa | la @sopa] [o no] [@chef]",
      "[entonces | o sea que | pero] no (le | te) (gustó | gusta) [mi @sopa | el @sopa | la @sopa]",
      "(que | como) (le | te) (parecio | supo) [mi @sopa | el @sopa | la @sopa] [@chef]",
    ] },
    // "¿Lo puedo poner en el pizarrón?": the learner's goal (the specials board)
    ask_board: { patterns: [
      "(lo | la) (puedo | podemos | vamos a | va a | vas a) (poner | apuntar | escribir | anotar) en (el pizarron | la pizarra | los especiales | el menu | la carta) [hoy | esta noche] [@chef]",
      "(va | entra | queda) (en el pizarron | en la pizarra | en los especiales | al pizarron | a la pizarra | a los especiales | en el menu) [hoy | esta noche] [@chef]",
      "(lo | la) apunto en (el pizarron | la pizarra) [@chef]",
    ] },
    no_feedback: { patterns: [
      "no (necesito | quiero) [ningun | ningunos | ninguna]? (@fb | opinion) [ahorita | ahora | hoy] #tip:defensive",
      "(mi @sopa | el @sopa) (ya)? (esta | es) (perfecto | perfecta | bien | bueno | buena) [no necesito (@fb | nada)] #tip:defensive",
      "(tal vez | quizas | quiza | a lo mejor | mejor) (despues | mas tarde | al rato | luego | despues del servicio | otro dia | manana)",
      "(ahorita | ahora) no [chef]",
      "(podemos | puede | puedes) (dejarlo | hacerlo) para (despues | mas tarde | luego | manana)",
      "(estoy | ando) [muy | un poco | super] @ocupado [ahorita | ahora]",
      "prefiero que no [ahorita | hoy]",
      "[ya] se que (esta | es) (bueno | buena | perfecto | perfecta) #tip:defensive",
      "[si] pero (ahorita | ahora) no", "(ahorita | ahora | hoy) no puedo [chef]",
      "(mas tarde | despues | luego | al rato) [chef]",
      "(ahorita | ahora | hoy) no tengo tiempo",
    ] },

    // --- receiving the feedback ---------------------------------------------------------
    thanks_helpful: { patterns: [
      "[gracias | muchas gracias] [@chef | @fa] (me sirve | me ayuda | me sirvió | me sirvio | me ayudó | es muy util | es util | me es muy util) [mucho] #h:thanks_helpful",
      "(eso | esto) (es | fue) (muy)? (util | de mucha ayuda | buenisimo)",
      "(buen | muy buen | gran) (consejo | punto | comentario | tip)",
      "[muchas] gracias por (los | sus | tus | el | su | tu) (@fb | consejo | consejos | sugerencia | sugerencias | honestidad | ayuda | tip | tips) [@chef] #h:thanks_for_fb",
      "gracias por (decirmelo | ser honesto | ser tan honesto | ser sincero | la sinceridad)",
      "(tiene | tienes) [mucho | todo el] sentido #h:makes_sense",
      "(ya)? (entiendo | veo) (lo que (quiere | quieres) decir | su punto | tu punto) #h:see_what_mean",
      "(tiene | tienes) (razon | toda la razon) [@chef] [le falta (vida | algo | sal | acidez | sabor | limon)] #h:youre_right",
      "le falta (vida | algo | acidez | sabor | un poco de acidez | un poquito de acidez | un poco de vida) [tiene razon | tienes razon]",
      "(si | es cierto | es verdad) le falta (vida | algo | acidez | sabor)",
      "estoy de acuerdo [con (usted | tigo | contigo)]",
      "(le | te) agradezco (la | su | tu) (honestidad | sinceridad | opinion | @fb | consejo) #h:appreciate",
      "(es | eso es) (cierto | verdad)", "(buena | muy buena) observacion", "yo (pensé | pense) lo mismo",
      "gracias @fa [me sirve mucho] #h:thanks_mia",
      "(lo | eso) (tomo | voy a tomar | tendre) en cuenta",
      "(muy | super) util", "(que | muy) buen (consejo | punto | comentario)", "(tiene | tienes) toda la razon", "(ah | ok)? ya veo [lo que (quiere | quieres) decir]",
      "(si | es cierto) le falta algo", "me parece (bien | justo | muy bien) [el comentario]",
    ] },
    will_work: { patterns: [
      "(lo | la) voy a (mejorar | trabajar | arreglar | corregir | cambiar | ajustar) [@chef] #h:work_on_that",
      "voy a trabajar en (eso | ello | la acidez | el sabor)",
      "(lo | la) (mejoro | arreglo | corrijo | ajusto | cambio) [ahorita | ahora | para la noche | para hoy]",
      "voy a (ponerle | echarle | agregarle) [@poco] @acido [ahora | ahorita] #acid",
      "(le pongo | le echo | le agrego) [@poco] @acido [ahorita | ahora] #acid",
      "(lo | la | eso) voy a (intentar | probar)",
      "(dejeme | dejame) (arreglarlo | arreglarla | mejorarlo | mejorarla | corregirlo)",
      "(ahorita | ahora | ya) (lo | la) (arreglo | mejoro | corrijo)",
      "(lo | la) (intento | pruebo) [ahorita | ahora]",
      "la proxima vez (le pongo | le pondre | le pondré | le echo) [@poco] @acido #acid",
      "(le voy a poner | le voy a echar | voy a ponerle) [@poco] {fix:ingredient}",
      "voy a (intentarlo | probarlo | arreglarlo | mejorarlo)", "(lo | la) (intentaré | intentare | probaré | probare | mejoraré | mejorare | arreglaré | arreglare | corregiré | corregire)",
      "voy a probar con [@poco] @acido #acid", "(lo | la) voy a hacer mejor", "(ahorita | ahora) mismo (lo | la) (arreglo | mejoro)",
    ] },
    defensive: { patterns: [
      "[pero] siempre (lo | la) (hago | preparo | cocino) asi #tip:defensive",
      "[pero] (es | esta es) (la | una | mi) receta (de mi abuela | de mi abuelita | de mi mama | de mi madre | de mi familia | familiar) #tip:defensive #family",
      "[pero] (mi abuela | mi abuelita | mi mama | mi madre | mi familia) (lo | la) (hace | hacia | hacía | prepara | preparaba) asi #tip:defensive #family",
      "[pero] asi (lo | la) (hace | hacia | hacía | hacemos | hacen) (mi abuela | mi mama | mi familia | en mi casa) #tip:defensive #family",
      "(asi | como esta) (esta | es) (perfecto | perfecta | bien | bueno | buena) #fine",
      "no creo que le (falte | haga falta) (nada | vida | acidez | sal | limon) #tip:defensive",
      "(esta | es) (perfecto | perfecta) (asi | como esta) #tip:defensive",
      "no estoy de acuerdo #tip:defensive",
      "(no tiene razon | no tienes razon | se equivoca | te equivocas | eso no es cierto | no es cierto | no es verdad | eso no es verdad) #tip:defensive",
      "(usted se equivoca | tu te equivocas | esta equivocado | estas equivocado) #tip:defensive", "no le voy a cambiar nada #tip:defensive",
      "[yo] creo que (esta | queda) bien asi #tip:defensive", "[no (se | sé)] a mi me gusta asi #tip:defensive", "no estoy de acuerdo con (usted | tigo | contigo) #tip:defensive",
      "asi (debe | tiene que) (ser | saber | estar) #tip:defensive", "asi es como (debe | tiene que) (ser | saber) #tip:defensive",
      "en mi (pais | tierra | casa) (lo | la) (hacemos | comemos | hacen | comen | preparamos | cocinamos) asi #home #tip:defensive",
      "asi (lo | la) (hacemos | hacen | comemos | preparamos | cocinamos) en mi (pais | tierra | casa) #home #tip:defensive",
      "(a todos | a todo el mundo | a mi familia | a mis amigos) les gusta asi #tip:defensive",
      "(nadie | nunca nadie) se ha quejado #tip:defensive",
      "usted no (entiende | conoce) (este @sopa | la comida de mi pais | esta receta) #tip:defensive",
      "no le falta (nada | vida | acidez | sal | limon) #tip:defensive",
      "(me gusta | lo prefiero | la prefiero | me gusta mas) (asi | como esta) #tip:defensive",
      "no (necesita | le hace falta) (nada | cambios | limon | acidez | mas acidez) #tip:defensive",
      "no (necesito | quiero) (sus | tus) (@fb | consejos | opiniones) #tip:defensive",
      "[eso] no tiene sentido #tip:defensive", "no me (sirve | ayuda) [de nada | para nada] #tip:defensive",
      // "No me gustó (su comentario)": the learner's own dislike (never "¿No le gustó?", one little word away)
      "no me (gustó | gusta) [nada | para nada | mucho | tanto] [su | tu | el | la]? [comentario | opinion | idea | consejo]? #tip:defensive",
      "no (lo | la) voy a cambiar #tip:defensive", "no (voy a | pienso) cambiar (nada | la receta) #tip:defensive",
      "no le voy a poner (limon | vinagre | nada | acidez) #tip:defensive", "nunca le (pondria | voy a poner) (limon | vinagre) #tip:defensive",
    ] },
    ask_example: { patterns: [
      "(me | nos) (puede | podria | puedes | podrias) dar un ejemplo [@chef] #h:give_example",
      "(deme | dame) un ejemplo", "(un | algun) ejemplo", "por ejemplo",
      "(puede | puedes | podria | podrias) darme un ejemplo",
      "que le (puedo | podria | debo) (poner | echar | agregar)", "(tiene | tienes) un ejemplo",
      "(como que | por ejemplo que | tipo que) #h:like_what",
      "que (le | se) (pondria | pondrias | pone | pongo | agrego | agregaria | agregarias | echo | echaria | echarias) [usted | tu] #h:what_add",
      "que (quiere | quieres | quiso | quisiste) decir con (acidez | vida | eso | lo de la acidez | le falta vida | acido) #h:what_mean",
      "(que | cual) (tipo de)? acido [me recomienda | me recomiendas | usaria | usarias | uso]",
      "cuanto (limon | acido | vinagre)? (le pongo | le echo | le pondria | uso)",
      "(me | nos) (puede | puedes) (ensenar | mostrar) [como]",
      "que (me recomienda | me recomiendas | sugiere | sugieres | haria | harias | haria usted)",
      "(tiene | tienes) (algun ejemplo | alguna idea | alguna sugerencia | algun consejo)",
      "(puede | podria | puedes) ser mas (especifico | concreto | claro)",
      "[le pongo | le echo | le agrego | uso | pongo] @acido o @acido", "(cual | que) es mejor [@acido o @acido]",
      "como (le doy | le pongo | consigo) (mas)? (acidez | vida)",
      "como (lo | la) (arreglo | mejoro | compongo)",
      "que (puedo | podria | deberia) (ponerle | agregarle | echarle | hacer) [para (mejorarlo | arreglarlo)]",
      "no (entiendo | entendí | entendi) lo que (quiere | quieres) decir",
      "a que se refiere [con (eso | acidez | vida)]", "a que te refieres [con (eso | acidez | vida)]", "que tipo de (acidez | acido)",
      // "¿Qué significa acidez?": his word, so his example answers it (never "Exacto" for a guess of lime)
      "que (significa | es) [la | lo]? (acidez | acido | le falta vida | falta vida)",
      "no (se | sé) (que | cuanto) (ponerle | echarle | agregarle | le pongo)", "(cuanto | cuanta) le (pongo | echo)",
    ] },
    // "No tengo dudas." / "Todo claro." (to "¿Me explico?" / "¿Alguna duda?")
    no_questions: { patterns: [
      "no (tengo | hay) [ninguna | mas]? (dudas | duda | preguntas | pregunta)", "(ninguna | ni una) [duda | pregunta]",
      "(todo | todo esta | esta todo) (claro | clarisimo)", "(ya)? (entendí | entendi) [todo]", "(nada | nada mas) [@chef]",
      "ya no tengo (dudas | preguntas)",
    ] },
    guess_lemon: { patterns: [
      "[tal vez | quiza | quizas | a lo mejor] [@poco] @acido [@chef] #h:maybe_lemon",
      "(como | por ejemplo | tipo) [@poco] @acido",
      "(se refiere a | te refieres a | o sea) [@poco] @acido",
      "(y | que tal) [@poco] @acido",
      "con [@poco] @acido",
      "[@poco] @acido (serviria | funcionaria | ayudaria | estaria bien)",
      "(podria | podría) (ponerle | echarle | usar) [@poco] @acido",
      "[tal vez | quiza | a lo mejor] [@poco] @sal #salt", "(le pongo | le echo) [@poco] @sal #salt",
    ] },
    ask_again: { patterns: [
      "(puede | podria | puedes | podrias) (probarlo | probarla | probar) (otra vez | de nuevo | nuevamente | una vez mas | ahora) [@chef] #h:taste_again",
      "(lo | la) (puede | podria | puedes | podrias) probar (otra vez | de nuevo | nuevamente | ahora)",
      "(pruebelo | pruebalo | pruebela | pruebala) (otra vez | de nuevo | ahora | una vez mas) [@chef]",
      "(lo | la) (vuelve | vuelves | puede volver | puedes volver) a probar",
      "(otra | una) (probadita | probada) [mas]",
      "[ya] (esta | quedó | quedo) mejor [ahora] [@chef] #h:better_now",
      "(que tal | como esta | como sabe | como quedó | como quedo) ahora", "que (le | te) parece ahora", "(esta | ya esta) (bien | bueno | mejor) (ahora | asi)",
      "[ya] (le puse | le eché | le eche | le agregué | le agregue | le añadí | le anadi) [@poco] (@acido | {fix:ingredient}) [(pruebelo | pruebalo) [otra vez | ahora]] #h:i_added",
      "(listo | ya esta | ya quedó | ya quedo) (pruebelo | pruebalo) [otra vez | ahora | de nuevo]",
      "(me lo | me la) (prueba | pruebas) (otra vez | de nuevo)", "como (lo | la) (ve | ves) ahora", "(ya)? (esta | quedó | quedo) (mejor | bien) [chef]",
    ] },
    // "¿Y ahora?" / "Listo." (only while the chef waits for the second taste)
    again_ctx: { patterns: ["[y] ahora", "mejor", "listo", "ya esta", "ya quedó", "ya quedo"] },

    // --- the second idea (tortilla strips) ----------------------------------------------------
    accept_idea: { patterns: [
      "no lo (habia | había) pensado (asi | de esa forma | de esa manera) #h:hadnt_thought",
      "no lo (habia | había) pensado [@fa] #h:hadnt_that", "no (habia | había) pensado en (eso | la tortilla | el habanero | @cruj)",
      "(buena | muy buena | gran | excelente | interesante) idea [@chef | @fa] [lo voy a probar | la voy a probar | lo pruebo | la pruebo] #h:good_idea",
      "(buen | muy buen | gran) punto [@fa] [lo voy a probar | lo pruebo] #h:good_point",
      "que (buena | gran | interesante) idea",
      "(lo | la) (pruebo | voy a probar | intento | voy a intentar) de las dos (maneras | formas) #h:try_both",
      "(lo | la) (voy a probar | pruebo | intento) [con @cruj] [hoy | esta noche]",
      "(probemos | vamos a probar) [con @cruj]", "por que no [probamos]",
      "(suena | se oye) (bien | muy bien | interesante | rico | delicioso | buenisimo)",
      "@cruj (suena | se oye | suenan) (bien | rico)", "(me gusta | me encanta) (la idea | esa idea | la idea de @cruj)",
      "no es (mala idea | una mala idea)",
      "(si | claro | ok | bueno) (le pongo | le pondre | le pondré | le voy a poner) [unas] @cruj",
      "(tal vez | quiza) (tiene | tienes) razon",
      "(me parece | suena como) (una)? (buena | gran | excelente) idea", "(va | sale | ok | bueno) (lo | la) pruebo",
    ] },
    keep_own: { patterns: [
      "entiendo (su | tu) punto pero (prefiero | quisiera | me gustaria) (dejarlo | dejarla | mantenerlo) (tradicional | asi | como esta | sencillo | clasico) #h:see_point",
      "(entiendo | ya veo | buen punto) pero (en mi pais | yo) (lo | la) (servimos | sirvo | comemos | como) con @galletas [aparte | al lado]",
      "en mi (pais | tierra | casa) (lo | la) (servimos | comemos | acompañamos | acompanamos) con @galletas [aparte | al lado] #h:home_crackers",
      "(lo | la) (sirvo | servimos | como | comemos) con @galletas [aparte | al lado]",
      "[gracias pero] (prefiero | quisiera | me gustaria | creo que voy a) (dejarlo | dejarla | mantenerlo) (sencillo | sencilla | tradicional | asi | como esta | clasico) #h:rather_simple",
      "(prefiero | me gustan mas) [las] @galletas",
      "(lo | la) prefiero sin @cruj", "sin @cruj", "no (quiero | necesito) @cruj", "mejor sin @cruj",
      "lo voy a pensar", "(otro dia | la proxima vez) [tal vez]",
      "[no] [gracias] (mejor asi | asi esta bien | asi lo dejo | asi la dejo | lo dejo asi | la dejo asi | prefiero asi | lo prefiero asi) [gracias]",
      "@cruj no (es | son) (tradicional | tradicionales | de mi pais)",
      "(es | queda) mejor sin @cruj", "no creo que (le haga falta | necesite) @cruj",
      "prefiero (sin | no ponerle) (@cruj | chile | habanero | picante | salsa)", "[creo que] mejor no [gracias]",
      "no me gusta (el habanero | lo picante | el picante | el chile | la salsa de habanero)",
    ] },
    // "Con tortilla, entonces." / "Con galletas." (only while the chef asks about the strips)
    second_ctx: { patterns: [
      "no con @cruj [sino | mejor] con @galletas #keep", "[con] @cruj no [sino | mejor] [con] @galletas #keep", "[con] @cruj no #keep",
      "no con @galletas [sino | mejor] con @cruj #acc", "[con] @galletas no [sino | mejor] [con] @cruj #acc",
      "[ok | si | bueno] con @cruj [entonces] #acc", "[ok | bueno] con @galletas [entonces] #keep", "[ok | bueno] sin @cruj [entonces] #keep"] },
    reject_rude: { patterns: [
      "(que | es una) (mala | pesima | terrible | horrible) idea #tip:polite_disagree",
      "(es | que) una idea (mala | horrible | terrible | pesima) #tip:polite_disagree",
      "(ni loco | ni loca | de ninguna manera | jamas | ni de chiste) #tip:polite_disagree",
      "@cruj (son | es) (para los tacos | para tacos | horribles | horrible | una mala idea) #tip:polite_disagree",
      "(odio | no soporto) @cruj #tip:polite_disagree",
      "no me gusta (esa | la | tu | su) idea #tip:polite_disagree", "no (suena | se oye) bien #tip:polite_disagree",
      "(eso es | que) (ridiculo | absurdo | una tonteria) #tip:polite_disagree",
      "(olvidelo | olvidalo) #tip:polite_disagree", "no (es | me parece) (buena | una buena) idea #tip:polite_disagree",
      "no me (gusta | gustan) [la | las]? @cruj #tip:polite_disagree", "no me gusta [nada | para nada] #tip:polite_disagree",
      "no (voy a | quiero) (probarlo | ponerle @cruj | probar @cruj) #tip:polite_disagree",
    ] },

    // --- the favor ------------------------------------------------------------------------
    help_yes: { patterns: [
      "(claro | por supuesto | si | con gusto) [@chef] (con mucho gusto | con gusto | encantado | encantada) #h:happy_to",
      "(con mucho gusto | encantado | encantada | con gusto) [@chef] [la ayudo]",
      "[claro | si] [yo] (la | le | te) ayudo", "(puedo hacerlo | lo puedo hacer | yo lo hago | yo me encargo)",
      "[claro | si | ok] donde (esta | anda) [@fa | ella] #h:where_she",
      "[va | claro | si | ok] (que venga | llamela | llamala | traigala | traela)",
      "me encantaria (ayudarla | ayudar | ayudarle)",
      "no me (molesta | importa) (ayudarla | ayudar | hacerlo)",
      "[claro | si] (pruebo su ceviche | le digo | hablo con ella | lo pruebo)",
      "(no hay problema | sin problema) [chef] [donde esta]",
      "(esta bien | bueno | ok | va | sale) (lo hago | yo lo hago | la ayudo | yo la ayudo)",
    ] },
    // "Por supuesto, chef." (only while the chef asks for the favor)
    help_yes_ctx: { patterns: ["(claro | por supuesto | si | sale | va | vale | ok | de acuerdo | esta bien) [@chef] #h:of_course_chef", "(orale | dale | sale pues | va pues | claro que si) [@chef]"] },
    // hesitating — "No sé qué decirle." / "Sí, pero no soy chef.": a yes (the chef reassures and calls her)
    help_unsure_ctx: { patterns: [
      "[si | claro | ok | bueno] [pero] no soy (chef | cocinero | cocinera | experto | experta | profesional) [todavia]",
      "[si | claro | ok | bueno] [pero] no (se | sé) (que decirle | que le digo | como hacerlo | como decirle | como decirselo | dar comentarios)",
      "[ok | bueno] [pero] que le (digo | voy a decir)", "[ok | bueno] [pero] como (le digo | se lo digo | lo hago)",
      "no estoy (seguro | segura) de (poder | que pueda | saber) [hacerlo]",
      "no (se | sé) si (pueda | puedo | voy a poder) [hacerlo | ayudarla]",
      "[ok | bueno | si] (lo intento | voy a intentarlo | hago lo que pueda | hago mi mejor esfuerzo)",
    ] },
    // "¿Por qué yo?" / "¿No puede usted?": the chef explains, then asks again
    help_why_ctx: { patterns: ["por que yo", "por que no (lo hace | lo haces | le dice | le dices) [usted | tu] [mismo]", "[por que] no (puede | puedes) (hacerlo | decirle) (usted | tu) [mismo]", "(tengo que | por que tengo que) hacerlo yo"] },
    // "¿Quién es Fátima?" (only while the chef asks for the favor)
    help_who_ctx: { patterns: ["quien es [@fa | ella]", "(quien | cual) es la nueva", "no conozco a @fa", "(cual | quien) es @fa"] },
    help_no: { patterns: [
      "(me gustaria | me encantaria) [ayudarla] pero (estoy [muy] @ocupado | no puedo | no tengo tiempo)",
      "(estoy | ando) [muy | super | un poco] @ocupado [ahorita | ahora | hoy] [@chef]",
      "(no puedo | no quiero | prefiero no) [hacerlo | ayudarla | ayudar]",
      "no es mi (trabajo | chamba)", "que lo haga (alguien mas | otro | otra persona)", "(pidaselo | pideselo) a (alguien mas | otro)",
      "no tengo tiempo [ahorita | hoy]",
      "(ahorita | ahora | hoy) no puedo", "(tengo | traigo) mucho (trabajo | que hacer) [ahorita | hoy]",
    ] },

    // --- Fátima ----------------------------------------------------------------------------------
    offer_feedback: { patterns: [
      "(te | le) (puedo | podria) (hacer | dar | decir) (unos | algunos | un | mis)? (@fb | comentario) [@fa] #h:can_i_give",
      "(quieres | quiere) (unos | mis | algunos)? (comentarios | mi opinion)",
      "(te | le) puedo decir algo",
      "(puedo | podria) (darte | darle | hacerte | hacerle | decirte) (mi | unos | un | algunos)? (opinion | @fb | comentario)",
      "(puedo | podria) (probarlo | probar tu ceviche | probar | darle una probada | probar un poco)",
      "a ver (dejame | deja) (probarlo | probar) #h:let_me_taste", "(dejame | deja | dejeme) (probarlo | probar [tu ceviche])",
      "el chef me (pidio | pidió) que (lo | la)? (probara | te ayudara | te diera unos comentarios) #h:chef_asked",
      "(vengo | vine) a probar [tu ceviche]", "(voy a | lo voy a) probar(lo)?",
      "(ensename | muestrame) (tu ceviche)", "(este | ese) es tu ceviche",
      "me encantaria probar [lo | tu ceviche]",
      "(lo | la) puedo probar", "(me das | me dejas) (una probadita | probar | una probada)", "(a ver)? que (hiciste | preparaste)",
    ] },
    reassure: { patterns: [
      "no te preocupes [@fa] [seguro (esta | quedó | quedo) (rico | bueno | bien | delicioso)] #h:dont_worry",
      "seguro (esta | quedó | quedo) (rico | bueno | bien | delicioso | muy rico)",
      "(tranquila | tranqui | relajate | respira | con calma | sin presion | no hay prisa | tomate tu tiempo) [@fa] [es solo un ceviche] #h:no_stress",
      "es solo un ceviche #h:no_stress",
      "(no esta | no creo que este | seguro no esta) (horrible | tan mal | malo | feo)",
      "todo (esta | va a estar | va a salir) bien",
      "no (seas | te pongas) tan dura contigo [misma]",
      "(huele | se ve) [muy | super]? (delicioso | rico | bien | increible | buenisimo) #h:smells_great",
      "que (rico | bien) huele", "no (tienes que | hay por que) (preocuparte | disculparte | pedir perdon)",
      "nadie te va a (gritar | reganar)", "vas a estar bien", "no pidas perdon",
      "seguro que (esta | quedó | quedo) (rico | bueno | bien | delicioso)", "(que | tiene) (buena | muy buena) pinta", "no pasa nada",
      "no digas eso [seguro (que)? (esta | quedó | quedo) (rico | bueno | bien | delicioso)]",
    ] },
    calm_down: { patterns: ["(calmate | tranquilizate | calmese) [@fa] #tip:calm_down"] },
    // "¿Qué lleva?" / "¿Qué le pusiste?": what is in her ceviche
    ask_recipe: { patterns: [
      "que (lleva | le pusiste | le echaste | tiene adentro) [tu | el | este]? [@ceviche] [@fa]",
      "(con | de) que (lo | la)? (hiciste | preparaste)",
      "que ingredientes (lleva | tiene | le pusiste | usaste)",
      "(de que es | es de pescado o de camaron | es de pescado | es de camaron) [el | tu]? [@ceviche]",
    ] },
    // "Me gustan las tostadas." (while Fátima asks what worked): not hers, or not in a ceviche
    other_food_ctx: { patterns: ["(me gusta | me gustan | me encanta | me encantan) [mucho] [el | la | los | las | tu | tus] {o:other_food}", "[el | la | los | las | tu | tus] {o:other_food} (esta | estan) @bueno"] },
    // "Perdón por ser tan lenta." – "¡No lo eres!" (only then)
    encourage_ctx: { patterns: ["[no] no lo eres", "[no] (para nada | claro que no | nada que ver)"] },
    intro_mia_ctx: { patterns: ["(soy | me llamo | mi nombre es) {name}"] },
    nice_meet: { patterns: ["(mucho gusto | encantado | encantada | un placer) [@fa]", "igualmente [@fa]"] },
    praise_part: { patterns: [
      "lo que (te quedó | te quedo | te salió | te salio | funcionó | funciono) (muy bien | super bien | increible | perfecto) (fue | es) @art {good:good_part} #h:worked_well",
      "me (gusta | gustó | gusto | encanta | encantó | encanto | gustan | encantan) [mucho] @art {good:good_part} #h:really_like",
      "@art {good:good_part} (te quedó | te quedo | te salió | te salio) (perfecto | perfecta | muy bien | buenisimo | buenisima | riquisimo | riquisima | increible | super bien) #h:nailed",
      "@art {good:good_part} (esta | estan | es | sabe) [muy | super | bien]? @bueno #h:x_great",
      "que (rico | rica | buen | buena | bueno | fresco | fresca | bonito | bonita | sabroso | sabrosa) (esta | estan | se ve)? @art {good:good_part} #h:x_great",
      "te (quedó | quedo | salió | salio) (perfecto | perfecta | muy bien | buenisimo | buenisima | riquisimo | riquisima | increible) @art {good:good_part} #h:nailed",
      "lo mejor (es | fue) @art {good:good_part}", "@art {good:good_part} (es | fue) lo mejor",
      "(y | tambien) @art {good:good_part} [esta @bueno]",
      "@art {good:good_part} (esta | quedó | quedo) en su punto",
      "me encanta como (te quedó | te quedo | quedó | quedo) @art {good:good_part}",
      "lo que (mas)? me (gustó | gusto | encantó | encanto | gusta | encanta) (fue | es) @art {good:good_part}",
      "(esta | quedó | quedo) (muy | super)? (fresco | fresquisimo) #pt:pescado",
      "@art {good:good_part} (esta | se ve) (muy | super)? (bonito | bonita | bien hecho | bien hecha)",
      "(esta | estan) [muy | super | bien]? @bueno @art {good:good_part}", "tiene (muy | un)? (buen | rico | gran) sabor #pt:sabor", "tiene (muy | un)? (buen | bonito) color #pt:color",
    ] },
    // "El aguacate." / "Todo." (while Fátima asks what worked)
    good_ctx: { patterns: ["[el | la | los | las | tu | tus] {good:good_part}", "[el | la | los | las | tu | tus] {good:good_part} [sin duda | definitivamente | creo]",
      "[si] (todo | todo todo | todito) [me gustó | me encantó | me gusto | me encanto] #all"] },
    praise_general: { patterns: [
      "(esta | quedó | quedo) [muy | super | bien | realmente | de verdad] (rico | buenisimo | delicioso | sabroso | bueno | riquisimo | increible | excelente | perfecto) [@fa] #h:really_good",
      "(buen | muy buen | excelente | gran) trabajo [@fa] #h:great_job", "(bien hecho | felicidades | muy bien hecho) [@fa]",
      "(me encanta | me gusta [mucho] | me encantó | me gustó | me gusto) [tu ceviche] [@fa] #h:love_it",
      "no (esta | estuvo) mal #notbad #tip:not_bad", "(esta | quedó) (ok | aceptable | regular) #notbad #tip:not_bad",
      "(sabe | esta) mejor que (el mio | lo mio)", "(tienes | tiene) (talento | buena mano | buen sazon | buena sazon)",
      "(cocinas | cocina) (muy bien | delicioso | rico)", "(eres | es) (muy)? buena cocinera", "yo lo (pediria | pido | ordenaria)",
      "(este | tu) ceviche (esta | sabe | quedó | quedo) [muy | super] @bueno",
      "(el mejor | es el mejor) ceviche [que he probado | del pueblo]",
      "sabe (muy | super)? (bien | rico)", "no (esta | estuvo) nada mal", "no sabe mal #notbad #tip:not_bad", "(vas | va) muy bien [@fa]",
    ] },
    // "¡Delicioso!" (just after tasting)
    praise_short_ctx: { patterns: [
      "(rico | riquisimo | delicioso | buenisimo | sabroso | excelente | perfecto | increible | wow | mmm | que rico | muy rico | super rico | genial | buenazo)",
    ] },
    blunt_bad: { patterns: [
      "(esta | sabe) [muy | super | bien | medio]? (feo | horrible | malo | terrible | asqueroso | espantoso | fatal | incomible) #tip:blunt_bad",
      "no (esta | sabe) (rico | bueno | bien | sabroso) #tip:blunt_bad",
      // "No está buenísimo" and "No, está buenísimo" sound the same (rule 10): she asks
      "no (esta | sabe) (buenisimo | riquisimo | delicioso | increible | perfecto | buenazo) #amb",
      "(no muy | no tan) (rico | bueno) #tip:blunt_bad",
      "no me (gusta | gustó | gusto) [nada | para nada] #tip:blunt_bad",
      "no me (gusta | gustó | gusto) (mucho | tanto) #tip:blunt_bad",
      "(guacala | fuchi | que asco) #tip:blunt_bad",
      "(tiralo | hazlo otra vez | empieza de nuevo | vuelve a empezar) #tip:blunt_bad", "(deberias | tienes que | mejor) (tirarlo | hacerlo otra vez | empezar de nuevo) #tip:blunt_bad",
      "nadie (se lo va a comer | lo va a pedir | lo va a comer) #tip:blunt_bad", "(es | esto es) un desastre #tip:blunt_bad",
      "nada (esta | quedó | quedo) bien #tip:blunt_bad", "nada me (gusta | gustó | gusto | encanta | encantó | encanto | convence | convencio) #tip:blunt_bad",
      "(sabe | esta) (raro | extrano) #tip:blunt_bad", "no me (convence | encanta) #tip:blunt_bad", "no hay nada (bueno | rico) #tip:blunt_bad",
      "todo (esta | quedó | quedo | sabe)? (mal | feo | horrible | malo | fatal) #tip:blunt_bad",
    ] },
    problem_state: { patterns: [
      "(esta | quedó | quedo) [un poco | un poquito | algo | medio | muy | demasiado | bien | super] (picante | salado | soso | simple | insipido | acido | aguado | seco | dulce | tibio | crudo | duro | simplon)",
      "(le falta | le hace falta) (algo | sabor | un poco de sabor | sazon)", "algo le falta",
      "(le sobra | tiene mucho | tiene demasiado) (sal | limon | chile | cebolla | cilantro | picante)",
      "(pica | pica mucho | pica demasiado | enchila)",
      "@art {good:good_part} (esta | estan) [un poco | algo | muy | demasiado | medio]? (salado | crudo | duro | blando | seco | aguado | soso | picante | acido | grande | grueso | tibio | pasado)",
      "no me (gusta | gustó | gusto | encanta | encantó | encanto | gustan | encantan) [mucho | tanto] @art {good:good_part}",
      "@art {good:good_part} no me (gusta | gustó | gusto | encanta | encantó | convence) [mucho | tanto]",
      "@art {good:good_part} no (esta | estan) [muy | tan]? @bueno",
      "[pero] no @art {good:good_part}", "[pero] @art {good:good_part} no",
    ] },
    suggest_fix: { patterns: [
      "una cosa que (podrias | puedes | podria) probar (es | seria) (ponerle | agregarle | echarle)? [@poco] @fixnp #h:one_thing",
      "[tal vez | quiza | quizas] (podrias | puedes) (ponerle | agregarle | echarle | anadirle | usar | probar con) [@poco] @fixnp [la proxima vez] #h:could_add",
      "[tal vez | quiza] (ponle | agregale | echale | prueba con | usa | anadele) [@poco] @fixnp [la proxima vez] #h:maybe_try",
      "(has | haz)? pensado en (ponerle | agregarle | echarle | usar)? [@poco] @fixnp #h:thought_about",
      "yo le (pondria | agregaria | echaria) [@poco] @fixnp #h:id_suggest",
      "(que tal | y si le pones | y si le echas | y si le agregas | que tal si le pones | que tal si le agregas) [@poco] @fixnp #h:what_about",
      "le (falta | hace falta) [@poco] @fixnp #h:falta_sal",
      "(necesita | ocupa) [@poco] @fixnp",
      "(te recomiendo | te sugiero | le recomiendo) (ponerle | agregarle | usar)? [@poco] @fixnp",
      "(deberias | podrias) (ponerle | agregarle | echarle) [@poco] @fixnp",
      "(tienes que | debes | necesitas) (ponerle | agregarle | echarle | usar) [@poco] @fixnp #tip:you_must #must",
      "yo que tu le (pondria | echaria) [@poco] @fixnp",
      "[tal vez] [@poco] @fixnp [arriba | encima] [tal vez]",
      "[@poco] @fixnp (le quedaria | quedaria | iria) (bien | muy bien | perfecto)",
      "(probaste | has probado) (con)? [@poco] @fixnp",
      "mi (consejo | sugerencia | recomendacion) (es | seria) (ponerle)? [@poco] @fixnp",
      "(le iria | le quedaria) (bien | muy bien) [@poco] @fixnp", "por que no le (pones | echas | agregas) [@poco] @fixnp",
      "yo (usaria | pondria) [@poco] @fixnp", "le (pondria | echaria | agregaria) [@poco] @fixnp",
      "(esta | quedó | quedo) [un poco | algo] (soso | simple | insipido) [asi que]? [tal vez]? (ponle | podrias ponerle | agregale) [@poco] @fixnp",
      // "Más sal no, más limón" / "No le pongas cilantro, ponle mango": the second item is the suggestion (rule 10)
      "[mas] {nofix:ingredient} no [mejor | sino] [@poco] @fixnp",
      "no (le pongas | le eches | le agregues) [mas] {nofix:ingredient} [mejor] (ponle | echale | agregale) [@poco] @fixnp",
    ] },
    // "No le pongas sal." / "No necesita más limón." (no suggestion: never "add salt")
    suggest_not: { patterns: [
      "no (le pongas | le eches | le agregues | uses) [nada de | mas] @fixnp",
      "no (necesita | le hace falta | ocupa) [mas]? @fixnp",
      "yo no le (pondria | echaria | agregaria) [nada de | mas] @fixnp",
      "(sin | nada de | cero) @fixnp", "(tal vez | mejor) sin @fixnp",
      "no te (recomiendo | recomendaria) (ponerle | usar) @fixnp", "no (deberias | debes) (ponerle | usar) @fixnp",
      "no le (falta | hace falta) @fixnp",
      "no (necesitas | hace falta) (ponerle | agregarle | echarle) [mas]? @fixnp", "no le (pondria | echaria) [mas]? @fixnp", "no mas @fixnp",
    ] },
    suggest_other: { patterns: [
      "[tal vez] (dejalo | dejala | deja el pescado) (mas tiempo | un poco mas | un rato mas) [en el limon | marinando | en el jugo] #h:marinate",
      "(esta | quedó | quedo) un poco crudo [asi que]? [tal vez]? (dejalo | deja el pescado) mas tiempo [en el limon]",
      "[tal vez | podrias] (ponerle | usar | echarle) menos (sal | limon | chile | cebolla | cilantro | @fixnp)",
      "(tienes que | debes) (ponerle | usar) menos (sal | limon | chile | cebolla | @fixnp) #tip:you_must #must",
      "(ponle | echale) menos (sal | limon | chile | cebolla | cilantro | @fixnp)",
      "(usa | pon | usar) menos (sal | limon | chile | cebolla | cilantro | @fixnp)", "[yo] le (pondria | echaria) menos (sal | limon | chile | cebolla | cilantro | @fixnp)",
      "(quitale | quita | sacale) las semillas [al (chile | habanero)] #h:seeds",
      "(esta | quedó | quedo) [un poco | muy | algo | demasiado] picante [asi que]? [tal vez]? (quitale | quita | sacale) las semillas [al (chile | habanero)] #h:seeds",
      "(no le pongas | no le eches) tanto @fixnp", "(menos | no tanto) @fixnp [tal vez | la proxima vez]", "ya no (le pongas | le eches) [mas] @fixnp",
      "(corta | pica) (el pescado | la cebolla | el tomate | el aguacate | el cilantro) mas (chico | pequeno | fino | grande | finito)",
      "(sirvelo | servirlo) (mas frio | bien frio | frio)", "(ponle | agregale) (el aguacate | el cilantro) al final",
    ] },
    // "Una cosa que podrías probar es nuez moscada": a suggestion with words the game doesn't know
    suggest_unknown: { patterns: ["(una cosa que podrias probar es | podrias ponerle | yo le pondria | has pensado en | te recomiendo | prueba con | que tal) {w:any}"] },
    no_fix: { patterns: [
      "(nada | la verdad nada | de verdad nada) [esta perfecto | esta perfecta] [asi] [@fa]",
      "[yo] no le (cambiaria | cambiaría | pondria | agregaria) nada", "no (cambies | le cambies) nada", "(esta | es) perfecto (asi | como esta)",
      "no le (encuentro | veo) nada [malo]", "todo (esta | quedó | quedo) (perfecto | muy bien | bien)",
      // "¿Y cuál es la mala noticia?" – "No hay mala noticia."
      "no hay [ninguna]? (mala noticia | malas noticias) [@fa]", "(ninguna | cero) mala noticia", "no hay nada (malo | que cambiar)",
      "no tiene nada [de]? malo",
    ] },
    howmuch_ans: { patterns: [
      "[nada mas | solo | nomas] (un poquito | un poco | tantito | poquito | un poquitito) [nada mas] #h:just_little",
      "(una pizca | unas gotas | unas gotitas | un chorrito | un toque) [de @fixnp] [nada mas] #h:just_pinch",
      "(una | media) (cucharadita | cucharada) [de @fixnp]", "{number} (cucharaditas | cucharadas | gotas | pizcas | chorritos)",
      "(empieza | comienza) con (poquito | un poquito | poco) [y] (luego | despues)? (vuelve a probar | prueba | pruebalo otra vez) #h:start_little #gradual",
      "poco a poco #h:little_at_time #gradual", "(ve | vas) probando #gradual", "al gusto #gradual",
      "hasta que (sepa | quede) (bien | rico)", "no (mucho | tanto | demasiado)", "muy poco",
      "muy poquito", "(pruebalo | prueba | ve probando) mientras (le pones | le echas | lo haces) #gradual",
    ] },
    encourage: { patterns: [
      "(ya lo vas a lograr | ya te va a salir | lo vas a lograr | lo vas a hacer muy bien) [@fa] #h:get_there",
      "[no te preocupes | no se preocupe | no pasa nada | tranquila] (es | apenas es) (tu | su) primera semana #h:first_week",
      // "Es que… no quiero quedar mal con el chef." – "No vas a quedar mal."
      "no vas a quedar mal [con (el chef | nadie)]", "(al chef | el chef | a el) le va a (gustar | encantar)", "le va a (gustar | encantar) al chef",
      "el chef (esta | va a estar) (contento | contento contigo | orgulloso | orgulloso de ti)", "no te preocupes por el chef",
      "yo tambien (era | fui) (lento | lenta) [@first] #h:slow_too", "yo (era | fui) (lento | lenta) @first [tambien]",
      "(todos | todas | todo el mundo) (somos | fuimos | eramos | es) (lentos | lentas | lento) @first",
      "lo estas haciendo (muy bien | super bien | bien | increible) [@fa] #h:doing_great", "vas (muy | super) bien",
      "la (rapidez | velocidad) (llega | viene) con (el tiempo | la practica) #h:comes_time",
      "(con el tiempo | con la practica) (vas a ser | seras) (mas rapida | rapida)",
      "(eso | todo) (lleva | toma) tiempo", "echale (ganas | muchas ganas)", "(sigue asi | sigue practicando | no te rindas)",
      "la practica hace al maestro", "(aprendes | estas aprendiendo) (muy)? rapido",
      "(nadie | ninguno) es rapido @first", "vas a ser (rapida | una gran cocinera | muy buena | una gran chef) [pronto | muy pronto]",
      "no te preocupes por (eso | la velocidad | ser lenta | la rapidez)", "(ser lenta | ir lento) (esta bien | es normal) [@first]",
      "(creo en ti | tu puedes | si puedes)", "[no] no eres (lenta | tan lenta | muy lenta) [para nada]",
      "(es | eso es) normal [@first]", "(el sabor | la calidad) importa mas que la (rapidez | velocidad)",
      "no te compares [con (los demas | nadie)]", "todos empezamos (asi | de cero)",
      "vas bien", "(animo | mucho animo)",
      "(no te preocupes | no pasa nada | tranquila) [@fa] (vas [muy | super] bien | lo estas haciendo [muy | super] bien | ya lo vas a lograr | vas a mejorar)",
      "[pero] [con (el tiempo | la practica)] vas a (mejorar | ser mas rapida) [con (el tiempo | la practica)]", "todos (fuimos | hemos sido) (nuevos | nuevas | principiantes)", "(poco a poco | paso a paso) vas a (mejorar | ser mas rapida)",
    ] },
    rush: { patterns: [
      "(apurate | apurale | date prisa | mas rapido) [@fa] #tip:rush",
      "(tienes que | debes | necesitas) ser mas (rapida | rapido) #tip:rush",
      "(eres | estas) [muy | demasiado | super | bien | un poco] lenta #tip:rush",
      "(trabaja | cocina | hazlo) mas rapido #tip:rush", "eres lentisima #tip:rush", "no (vas | lo estas haciendo) [muy | tan]? bien #tip:rush",
      "(tienes que | debes) (trabajar | cocinar | hacerlo | ir) mas rapido #tip:rush",
    ] },

    // --- the goodbye --------------------------------------------------------------------------
    yes_chef_ctx: { patterns: [
      "(si | ok | va | sale | claro | de acuerdo) @chef #h:yes_chef",
      "(entendido | oido) [@chef] #h:heard",
      "(nos vemos | lo veo | te veo) en el servicio [@chef]", "a la orden [@chef]",
    ] },
    thanks_today: { patterns: [
      "[muchas] gracias por (lo de hoy | hoy | la clase | los consejos de hoy | la ayuda de hoy) [@chef] #h:thanks_today",
      "gracias a (los dos | ustedes)",
    ] },
    // "¿En serio?" / "¿Habanero en un chowder?" (only while Fátima waits for her idea's answer)
    twist_surprise_ctx: { patterns: [
      "(en serio | de veras | de verdad | neta)", "[salsa de | unas gotitas de | unas gotas de]? (habanero | chile habanero) [en (un | el | mi) chowder]",
      "en (un | el | mi) chowder", "(chile | picante) en (un | el | mi) chowder",
    ] },
  },

  lines: {
    // --- the chef: the chowder -------------------------------------------------------------
    greet: [
      t("Ahí | estás. | A ver, | ¿qué | traes?", "There | you-are. | Let's see, | what | are-you-bringing?", "There you are. So, what have you got?"),
      t("Bueno, | a ver | qué | tienes.", "Okay, | let's see | what | you-have.", "Okay, let's see what you've got."),
    ],
    greet_back: [
      t("¿Otra vez | por | más | comentarios? | A ver, | ¿qué | traes?", "Again | for | more | feedback? | Let's see, | what | are-you-bringing?", "Back for more feedback? So, what have you got?"),
    ],
    serve_again: [
      t("¿Y? | ¿Me | vas | a | dejar | probarlo, | o | nomás | lo | vas | a | admirar?", "So? | Me | you're-going | to | let | taste it, | or | just | it | you're-going | to | admire?",
        "So? Are you going to let me taste it, or just admire it?",
        { flags: { 7: "Mexican: nomás = just." },
          neutral: t("¿Y? | ¿Me | vas | a | dejar | probarlo, | o | solo | lo | vas | a | admirar?", "So? | Me | you're-going | to | let | taste it, | or | just | it | you're-going | to | admire?",
            "So? Are you going to let me taste it, or just admire it?") }),
    ],
    serve_take: [t("Ay, | a ver, | dámelo.", "Oh, | let's see, | give it to me.", "Oh, just hand it over.")],
    dish_react: [
      t("¿Un | chowder? | ¿Con | este | calor? | ¡Qué | valiente! | Déjame | agarrar | una | cuchara.", "A | chowder? | With | this | heat? | How | brave! | Let me | grab | a | spoon.",
        "A chowder? In this heat? Bold. Let me grab a spoon."),
      t("Un | chowder | de | pescado. | Toda | la | semana | estuve | esperando | esto.", "A | chowder | of | fish. | All | the | week | I-was | waiting-for | this.",
        "Fish chowder. I've been waiting for this all week."),
    ],
    ask_consent: [
      t("Bien. | ¿Te | puedo | hacer | unos | comentarios?", "Good. | (To) you | I-can | make | some | comments?", "Okay. Can I give you some feedback?"),
      t("Mmm. | ¿Te | puedo | dar | mi | opinión | honesta?", "Hmm. | (To) you | I-can | give | my | opinion | honest?", "Hmm. Can I give you some honest feedback?"),
    ],
    consent_no: [
      t("Bueno. | Pero | en | la | noche | la | mesa | nueve | también | te | va | a | dar | su | opinión, | y | son | menos | amables.",
        "Okay. | But | in | the | evening | the | table | nine | also | (to) you | it's-going | to | give | its | opinion, | and | they-are | less | kind.",
        "Fair enough. But tonight table nine will give you feedback too, and they're less polite.",
        { flags: { 16: "son: the people at the table (they)." } }),
    ],
    consent_again: [t("Treinta | segundos. | Te | prometo | que | no duele.", "Thirty | seconds. | (To) you | I-promise | that | it doesn't hurt.", "Thirty seconds. I promise it doesn't hurt.")],
    consent_no2: [t("Bueno, | te lo | digo | rápido.", "Okay, | it to you | I'll-say | quickly.", "Okay, I'll keep it short.")],
    nervous_react: [t("Tranquil{m:o|f:a}. | Es | un | chowder, | no | una | cirugía.", "Relax. | It's | a | chowder, | not | a | surgery.", "Relax. It's chowder, not surgery.")],

    // --- the feedback -----------------------------------------------------------------------
    feedback1a: [
      t("Lo que | te | quedó | muy | bien | fue | el | pescado: | está | en su punto. | ¡Y | qué | cremoso!", "What | (for) you | turned-out | very | well | was | the | fish: | it's | just right. | And | how | creamy!",
        "What worked really well was the fish: it's cooked just right. And so creamy!", { flags: { 1: F_TE } }),
      t("Lo que | te | salió | muy | bien | fue | la | textura. | Y | el | pescado | está | en su punto.", "What | (for) you | came-out | very | well | was | the | texture. | And | the | fish | is | just right.",
        "What worked really well was the texture. And the fish is cooked just right.", { flags: { 1: F_TE } }),
    ],
    feedback1b: [
      t("Una | cosa | que | podrías | probar | es | un | poquito | más | de | acidez. | Así como está, | le falta | vida.",
        "One | thing | that | you-could | try | is | a | little | more | of | acidity. | As it is, | it's missing | life.",
        "One thing you could try is a little more acid. Right now it tastes a bit flat.", { flags: { 13: "le falta vida: it lacks life = it tastes flat." } }),
    ],
    receive_react_thanks: [
      t("Bien. | Esa | es | exactamente | la | reacción | correcta.", "Good. | That | is | exactly | the | reaction | right.", "Good. That's exactly the right reaction."),
      t("Qué | bueno | que | te | sirva.", "How | good | that | (to) you | it-helps.", "Glad it helps."),
    ],
    receive_react_work: [t("Sé | que | lo | vas | a | hacer.", "I-know | that | it | you're-going | to | do.", "I know you will.")],
    receive_ok: [t("Bien.", "Good.", "Good."), t("Bueno. | Perfecto.", "Okay. | Perfect.", "Okay. Good.")],
    receive_help: [
      t("No tienes | que | estar | de acuerdo. | Nomás | dime | qué | piensas.", "You don't have | to | be | in agreement. | Just | tell me | what | you-think.",
        "You don't have to agree. Just tell me what you think.",
        { flags: { 4: "Mexican: nomás = just." },
          neutral: t("No tienes | que | estar | de acuerdo. | Solo | dime | qué | piensas.", "You don't have | to | be | in agreement. | Just | tell me | what | you-think.",
            "You don't have to agree. Just tell me what you think.") }),
    ],
    defensive_family: [
      t("Seguro | la | receta | de | tu | abuela | es | perfecta. | Pero | hoy | en | la | noche | se lo | van | a | comer | desconocidos.",
        "Surely | the | recipe | of | your | grandmother | is | perfect. | But | today | in | the | evening | it | they're-going | to | eat up | strangers.",
        "I'm sure your grandmother's recipe is perfect. Tonight, though, strangers are going to eat it.",
        { flags: { 13: "se lo: comerse = eat up; lo = it (the chowder)." } }),
    ],
    defensive_react: [
      t("Te | creo. | Nada más | te | digo | lo que | me | dice | mi | cuchara.", "You | I-believe. | Just | (to) you | I-tell | what | (to) me | says | my | spoon.",
        "I believe you. I'm just telling you what my spoon is telling me."),
    ],
    defensive_home: [
      t("En | tu | tierra | la | gente | sabe | qué | esperar. | La | mesa | nueve | viene | de | Monterrey.", "In | your | homeland | the | people | know | what | to expect. | The | table | nine | comes | from | Monterrey.",
        "Back home, people know what to expect. Table nine is from Monterrey."),
    ],
    def_move_on: [t("Bueno. | Nada más | piénsalo.", "Okay. | Just | think about it.", "Okay. Just think about it.")],
    receive_again: [t("¿Y? | ¿Qué | opinas?", "So? | What | do-you-think?", "So? What do you think?")],
    receive_skip: [t("Bueno. | Sigamos.", "Okay. | Let's-move-on.", "Okay. Moving on.")],
    // "¿Le gustó?" before the second taste; "¿Lo puedo poner en el pizarrón?" before and after it
    liked_yes: [
      t("Sí, | me | gustó. | Nada más | le falta | vida.", "Yes, | (to) me | it-pleased. | Just | it's missing | life.", "Yes, I liked it. It just tastes a bit flat.",
        { flags: { 5: "le falta vida: it lacks life = it tastes flat." } }),
    ],
    board_not_yet: [t("Primero | ajústalo. | Luego | vemos.", "First | adjust it. | Then | we-see.", "Adjust it first. Then we'll see.")],
    board_yes: [t("Sí. | Esta | noche | lo | ponemos | en | los | especiales.", "Yes. | This | night | it | we-put | on | the | specials.", "Yes. Tonight it goes on the specials.")],

    // --- the example and the second taste --------------------------------------------------
    // "¿Me explico?" – "Sí." = no questions; "¿Alguna duda?" – "Sí." = one is coming
    example_sense: [t("¿Me explico?", "Am I making myself clear?", "Makes sense?")],
    example_questions: [t("¿Alguna | duda?", "Any | question?", "Any questions?")],
    go_ahead: [t("Claro, | dime.", "Sure, | tell me.", "Sure, go ahead.")],
    example_give: [
      t("Por ejemplo, | unas | gotas | de | limón, | o | un | chorrito | de | vino | blanco. | Nada más | un | poquito.",
        "For example, | some | drops | of | lime, | or | a | splash | of | wine | white. | Just | a | little.",
        "For example, a squeeze of lime, or a splash of white wine. Just a little.", { flags: { 4: F_LIME } }),
    ],
    // "¿Más sal?": salt is not what he meant (the answer says so)
    example_salt: [
      t("No, | de | sal | está | bien. | Más bien | algo | ácido: | unas | gotas | de | limón.", "No, | of | salt | it's | fine. | Rather | something | sour: | some | drops | of | lime.",
        "No, the salt's fine. More like something sour: a squeeze of lime.", { flags: { 1: "de sal: as far as salt goes.", 11: F_LIME } }),
    ],
    example_confirm: [
      t("Exacto. | Nada más | un | poquito. | Luego | lo | vuelves | a | probar.", "Exactly. | Just | a | little. | Then | it | you-go-back | to | taste.",
        "Exactly. Just a little. Then taste it again.", { flags: { 6: "volver a + verb: do it again." } }),
    ],
    example_offer: [
      t("Te | doy | un | ejemplo: | unas | gotas | de | limón. | Nada más | un | poquito.", "(To) you | I-give | an | example: | some | drops | of | lime. | Just | a | little.",
        "Here's an example: a squeeze of lime. Just a little.", { flags: { 7: F_LIME } }),
    ],
    again_prompt: [
      t("Ándale, | ajústalo. | Aquí | te | espero.", "Go on, | adjust it. | Here | you | I'll-wait-for.", "Go ahead, adjust it. I'll wait.",
        { flags: { 0: "Mexican: ándale = go on." },
          neutral: t("Anda, | ajústalo. | Aquí | te | espero.", "Go on, | adjust it. | Here | you | I'll-wait-for.", "Go ahead, adjust it. I'll wait.") }),
    ],
    again_auto: [t("A ver, | déjame | probarlo | otra vez.", "Let's see, | let me | taste it | again.", "Here, let me taste it again.")],
    // "¿Cuánto le pongo?" / "¿Limón o vino blanco?" after the example: a short reminder, then he waits
    again_hint: [
      t("Unas | gotas | de | limón, | nada más. | Y | lo | vuelvo | a | probar.", "Some | drops | of | lime, | just. | And | it | I-go-back | to | taste.",
        "Just a squeeze of lime. Then I'll taste it again.", { flags: { 3: F_LIME, 7: "volver a + verb: do it again." } }),
    ],
    again_react: [
      t("¡Así sí! | Ahora | sí | sabe | a | mar.", "That's it! | Now | indeed | it-tastes | of | sea.", "Now we're talking! Now it really tastes like the sea.",
        { flags: { 2: "sí stresses the verb: now it really does." } }),
      t("¡Así sí! | Mucho | mejor. | Ahora | sí | es | un | chowder | de verdad.", "That's it! | Much | better. | Now | indeed | it's | a | chowder | real.",
        "Now we're talking! Much better. Now that's a real chowder."),
    ],

    // --- the second idea: the plating ------------------------------------------------------------
    second_ask: [
      t("Otra | cosa: | el | emplatado. | ¿Has | pensado | en | algo | crujiente? | Yo | le | pondría | unas | tiritas | de | tortilla | frita | arriba.",
        "Another | thing: | the | plating. | Have-you | thought | about | something | crunchy? | I | (on) it | would-put | some | little strips | of | tortilla | fried | on top.",
        "One more thing: the plating. Have you thought about some crunch? I'd put a few fried tortilla strips on top.",
        { flags: { 3: "el emplatado: how a dish is plated." } }),
    ],
    second_accept_react: [
      t("Bien. | Pruébalo | de | las | dos | maneras | y | compáralos.", "Good. | Try it | in | the | two | ways | and | compare them.", "Good. Try it both ways and taste them side by side."),
    ],
    // after "Lo pruebo de las dos maneras" (he doesn't say it back)
    second_accept_gold: [
      t("Bien. | Que | queden | doraditas, | ¿eh?", "Good. | (Make sure) | they-turn-out | golden, | eh?", "Good. Make sure they're nice and golden, okay?",
        { flags: { 1: "que + subjunctive: an instruction or a wish." } }),
    ],
    both_ways: [t("Entonces | pruébalo | de | las | dos | maneras | y | compáralos.", "Then | try it | in | the | two | ways | and | compare them.", "Then try it both ways and taste them side by side.")],
    second_keep_react: [
      t("Está bien. | Tu | plato.", "Okay. | Your | plate.", "Fair enough. Your plate."),
      t("Está bien. | Tu | chowder, | tus | reglas.", "Okay. | Your | chowder, | your | rules.", "Fair enough. Your chowder, your rules."),
    ],
    second_rude_react: [
      t("¡Ja! | No te guardes | nada, | ¿eh? | Está bien, | tu | plato.", "Ha! | Don't hold back | anything, | huh? | Okay, | your | plate.",
        "Ha! Don't hold back, huh? Fair enough, your plate."),
    ],
    second_reask: [t("Entonces, | ¿con | tortilla | o | sin | tortilla?", "So, | with | tortilla | or | without | tortilla?", "So, tortilla strips or no tortilla strips?")],
    second_skip: [t("Piénsalo.", "Think about it.", "Think about it.")],

    // --- the favor -------------------------------------------------------------------------------
    handoff1: [
      t("Ahora, | un | favor. | Fátima | empezó | el | lunes, | e | hizo | el | ceviche.", "Now, | a | favor. | Fátima | started | — | Monday, | and | made | the | ceviche.",
        "Now, a favor. Fátima started on Monday, and she made the ceviche.", { flags: { 5: "el lunes: on Monday; English needs no article.", 7: "e: y (and) before an i sound." } }),
    ],
    handoff2: [
      t("Le | da | miedo | preguntarme. | ¿Lo | pruebas | y | le | haces | unos | comentarios?", "(To) her | it-gives | fear | to ask me. | It | you-taste | and | (to) her | you-make | some | comments?",
        "She's too scared to ask me. Would you taste it and give her some feedback?"),
    ],
    handoff3: [
      t("Como | acabo | de | hacer | contigo. | Con | tacto.", "Like | I've-just | — | done | with you. | With | tact.", "The way I just did with you. Gently.",
        { flags: { 1: "acabar de + verb: have just done it." } }),
    ],
    handoff_again: [t("¿Entonces? | ¿La | ayudas?", "So? | Her | you-help?", "So? Will you help her?", { flags: { 1: "la: her (a pronoun here, not the article)." } })],
    handoff_yes: [
      t("Gracias. | ¡Fátima! | Ven | tantito.", "Thanks. | Fátima! | Come | a little bit.", "Thanks. Fátima! Come here a sec.",
        { flags: { 3: "Mexican: tantito = a little bit (here: a moment)." },
          neutral: t("Gracias. | ¡Fátima! | Ven | un | momento.", "Thanks. | Fátima! | Come | a | moment.", "Thanks. Fátima! Come here a sec.") }),
    ],
    handoff_anyway: [t("Ya | es | tarde. | ¡Fátima! | Ven | un | momento.", "Already | it's | late. | Fátima! | Come | a | moment.", "Too late. Fátima! Come here a sec.")],
    handoff_no: [
      t("No te pido | que | seas | su | chef, | nada más | {m:un|f:una} | {m:compañero|f:compañera} | amable. | Cinco | minutos.",
        "I'm not asking you | that | you-be | her | chef, | just | a | colleague | friendly. | Five | minutes.",
        "I'm not asking you to be her chef, just a friendly colleague. Five minutes.", { flags: { 2: "pedir que + subjunctive: ask someone to …" } }),
    ],
    // "No sé qué decirle." / "Sí, pero no soy chef." (then he calls her)
    handoff_unsure: [
      t("No necesitas | ser | chef. | Nada más | dile | qué | le | salió | bien | y | una | cosa | que | puede | probar.",
        "You don't need | to be | chef. | Just | tell her | what | (for) her | came-out | well | and | one | thing | that | she-can | try.",
        "You don't need to be a chef. Just tell her what worked, and one thing to try."),
    ],
    // "¿Quién es Fátima?"
    handoff_who: [t("La | cocinera | nueva. | La | del | ceviche.", "The | cook | new. | The (one) | of the | ceviche.", "The new cook. The one who made the ceviche.")],
    // "¿Por qué yo?" / "¿No puede usted?"
    handoff_why: [
      t("Porque | me | tiene | miedo. | Contigo | sí | va | a | hablar.", "Because | (of) me | she-has | fear. | With you | indeed | she's-going | to | talk.",
        "Because she's scared of me. She'll talk to you.", { flags: { 5: "sí stresses the contrast: with you, she will." } }),
    ],

    // --- the chef at the end --------------------------------------------------------------------------
    chef_end_good: [
      t("Así | se hace. | Eso | lo | va | a | recordar | por | años.", "Like that | it's done. | That | it | she's-going | to | remember | for | years.",
        "That's how it's done. She'll remember that for years."),
    ],
    chef_twist_laugh: [t("¡Ja! | Ya | aprendió.", "Ha! | Already | she-learned.", "Ha! Now she's got it.")],
    closing_chef: [
      t("Buen | trabajo, | {m:los dos|f:las dos}. | En | una | hora | empieza | el | servicio. | Prueben | todo | otra vez | antes.",
        "Good | work, | both of you. | In | an | hour | starts | the | service. | Taste | everything | again | before (then).",
        "Good work, both of you. Service starts in an hour. Taste everything again before then.",
        { flags: { 2: "los dos: a man and a woman (las dos: two women).", 9: "Prueben: ustedes, to both of you." } }),
    ],
    closing_partial: [
      t("No está | mal | para | una | tarde. | Mañana | probamos | todo | otra vez.", "It's not | bad | for | an | afternoon. | Tomorrow | we-taste | everything | again.",
        "Not bad for one afternoon. Tomorrow we taste it all again."),
    ],
    closing_reply: [
      t("Ándale. | Y | apunta | ese | chowder | en | el | pizarrón.", "Go on. | And | write down | that | chowder | on | the | board.", "Go on. And put that chowder on the specials board.",
        { flags: { 0: "Mexican: ándale = go on.", 7: "Mexican: pizarrón = board (elsewhere: pizarra)." },
          neutral: t("Anda. | Y | apunta | ese | chowder | en | la | pizarra.", "Go on. | And | write down | that | chowder | on | the | board.", "Go on. And put that chowder on the specials board.") }),
    ],
    bye_early: [
      t("¿Ya | te vas? | El | chowder | no se va | a | arreglar | solo.", "Already | you're-leaving? | The | chowder | isn't going | to | fix itself | alone.",
        "Leaving already? The chowder won't fix itself."),
    ],

    // --- Fátima ----------------------------------------------------------------------------------------
    mia_hi: [
      t("Hola. | Este... | el | chef | dijo | que | ibas | a | probar | mi | ceviche. | Perdón. | Seguro | está | horrible.",
        "Hi. | Um... | The | chef | said | that | you-were-going | to | taste | my | ceviche. | Sorry. | Surely | it's | terrible.",
        "Hi. Um… Chef said you'd taste my ceviche. Sorry. It's probably terrible.", { flags: { 1: "este…: “um”, a filler while you think." } }),
    ],
    mia_hi_nice: [
      t("Hola. | Bueno, | este... | aquí | está | mi | ceviche. | Porfa, | no seas | dur{m:o|f:a} | conmigo.",
        "Hi. | Well, | um... | here | is | my | ceviche. | Please, | don't be | hard | with me.",
        "Hi. So, um… this is my ceviche. Please be nice.", { flags: { 7: "porfa: casual for por favor." } }),
    ],
    // "Seguro está horrible." – "Sí.": she takes it with a laugh
    mia_oye: [t("¡Oye! | Gracias, | ¿eh?", "Hey! | Thanks, | huh?", "Hey! Gee, thanks.", { flags: { 1: "Said with a laugh: thanks a lot." } })],
    mia_wait: [t("¿Lo... | quieres | probar?", "It... | you-want | to taste?", "Do you… want to taste it?")],
    mia_here: [t("Ten. | Nada más | pruébalo.", "Here. | Just | taste it.", "Here. Just taste it.")],
    mia_ready: [
      t("Bueno. | Sí. | Porfa, | sé | {m:honesto|f:honesta}. | Pero, | o sea, | con | cariño.", "Okay. | Yes. | Please, | be | honest. | But, | like, | with | kindness.",
        "Okay. Yes. Please be honest. But, like, gently."),
    ],
    mia_reassured: [
      t("Gracias. | Llevo | una | hora | con | este | pescado. | Creo | que | ya | me | odia.", "Thanks. | I've-spent | an | hour | with | this | fish. | I-think | that | already | me | it-hates.",
        "Thanks. I've been working on this fish for an hour. I think it hates me by now.", { flags: { 1: "llevar + time: how long you've been at something." } }),
    ],
    // "¿Qué lleva?": a ceviche as made on the Yucatán coast
    mia_recipe: [
      t("Pescado | y | camarón, | limón, | cebolla | morada, | tomate, | pepino, | cilantro | y | un | poquito | de | habanero. | Y | aguacate | arriba.",
        "Fish | and | shrimp, | lime, | onion | red, | tomato, | cucumber, | cilantro | and | a | little | of | habanero. | And | avocado | on top.",
        "Fish and shrimp, lime, red onion, tomato, cucumber, cilantro, and a little habanero. And avocado on top.",
        { flags: { 3: F_LIME, 5: "cebolla morada: red onion (morada = purple)." } }),
    ],
    mia_calm_react: [t("¡Estoy | tranquila! | Totalmente | tranquila.", "I-am | calm! | Totally | calm.", "I am calm! Totally calm.")],
    mia_nice: [t("Mucho gusto.", "Nice to meet you.", "Nice to meet you.")],
    mia_nice_too: [t("Igualmente.", "Likewise.", "Nice to meet you too.")],
    mia_ask_good: [
      t("Entonces... | ¿hay | algo | bueno?", "So... | is-there | something | good?", "So… is anything good?"),
      t("Bueno... | ¿pero | hay | algo | que | te | haya | gustado?", "Okay... | but | is-there | something | that | (to) you | has | pleased?", "Okay… but is there anything you liked?",
        { flags: { 6: "haya gustado: subjunctive after “something that…” you're not sure exists." } }),
    ],
    mia_which: [t("Perdón, | ¿sí | te | gustó | o | no?", "Sorry, | yes | (to) you | it-pleased | or | not?", "Sorry, did you like it or not?",
      { flags: { 1: "sí before the verb: did you, or didn't you." } })],
    mia_what: [t("¿De veras? | ¿Qué?", "Really? | What?", "Really? What?")],
    mia_flinch: [t("Ay. | Bueno. | Perdón. | Ya | sabía.", "Oh. | Okay. | Sorry. | Already | I-knew.", "Oh. Okay. Sorry. I knew it.")],
    mia_relief: [
      t("¿De veras? | ¿Te | gustó | {X.the}? | ¡Ay, | qué | alivio!", "Really? | (To) you | it-pleased | {X.the}? | Oh, | what | relief!", "Really? You liked {X.the}? Oh, thank goodness."),
      t("Espérate, | ¿de veras? | Casi | lo | tiro | todo.", "Wait, | really? | Almost | it | I-throw-out | all.", "Wait, really? I almost threw it all out.",
        { flags: { 2: "casi + present: “I almost…” about the past, very common in speech." } }),
    ],
    mia_relief_general: [
      t("¿De veras? | ¿No lo dices | nomás | por | decir?", "Really? | You're not saying it | just | for | to-say?", "Really? You're not just saying that?",
        { flags: { 2: "Mexican: nomás = just." },
          neutral: t("¿De veras? | ¿No lo dices | solo | por | decir?", "Really? | You're not saying it | just | for | to-say?", "Really? You're not just saying that?") }),
    ],
    // "No está mal." (lukewarm): it counts, but she notices
    mia_lukewarm: [t("Mmm... | ¿nada más | “no está mal”? | Bueno...", "Hmm... | just | “not bad”? | Okay...", "Hmm… just “not bad”? Okay…")],
    mia_bad_news: [t("Bueno. | ¿Y | cuál | es | la | mala | noticia?", "Okay. | And | what | is | the | bad | news?", "Okay. So what's the bad news?")],
    mia_something: [t("Hay | algo, | ¿verdad? | Dímelo, | aguanto.", "There-is | something, | right? | Tell me, | I-can-take-it.", "There's something, right? Tell me, I can take it.")],
    mia_problem_react: [t("Ay, | no. | ¿Y | qué | hago?", "Oh, | no. | And | what | I-do?", "Oh no. So what should I do?")],
    mia_problem_back: [t("Bueno. | ¿Y | qué | hago | con | eso?", "Okay. | And | what | I-do | with | that?", "Okay. So what should I do about it?")],
    mia_what_do: [t("Entonces... | ¿qué | hago?", "So... | what | I-do?", "So… what should I do?")],
    mia_fix_it: [t("Bueno. | Lo | arreglo.", "Okay. | It | I'll-fix.", "Okay. I'll fix that.")],
    mia_try_odd: [t("¿En | un | ceviche? | Mmm. | Bueno, | lo | pruebo.", "In | a | ceviche? | Hmm. | Okay, | it | I'll-try.", "In ceviche? Huh. Okay, I'll try that.")],
    mia_try_ok: [t("Bueno. | Eso | sí | lo | puedo | hacer.", "Okay. | That | indeed | it | I-can | do.", "Okay. I can do that.")],
    mia_other: [t("¿{X}? | Mi | ceviche | no lleva | {X}.", "{X}? | My | ceviche | doesn't have | {X}.", "{X}? My ceviche doesn't have any {X}.")],
    mia_bought: [t("¿{X}? | ¡Esas | son | de | la | tienda!", "{X}? | Those | are | from | the | store!", "{X}? Those are from the store!")],
    mia_try_x: [t("Un | poquito | de | {X}. | Entendido.", "A | little | of | {X}. | Got it.", "A little {X}. Got it.")],
    mia_must_react: [t("Bueno... | lo | intento.", "Okay... | it | I'll-try.", "Okay… I'll try.")],
    mia_no_x: [t("Ah, | {X} | no.", "Oh, | {X} | not.", "Oh, okay. No {X}.")],
    mia_try_giveup: [t("Bueno. | Más tarde | lo | vuelvo | a | probar.", "Okay. | Later | it | I-go-back | to | taste.", "Okay. I'll taste it again later.")],
    mia_howmuch: [t("¿Me | das | un | ejemplo? | O sea, | ¿cuánto?", "(To) me | you-give | an | example? | Like, | how much?", "Could you give me an example? Like, how much?")],
    mia_howmuch_react: [t("Poco a poco. | Entendido.", "Little by little. | Got it.", "A little at a time. Got it.")],
    mia_howmuch_ok: [t("Bueno. | Entendido. | Gracias.", "Okay. | Got it. | Thanks.", "Okay. Got it. Thanks.")],
    mia_howmuch_unsure: [
      t("Bueno. | Le | pongo | un | poquito | y | lo | vuelvo | a | probar.", "Okay. | (In) it | I'll-put | a | little | and | it | I-go-back | to | taste.", "Okay. I'll add a little, then taste it again."),
    ],
    mia_slow: [
      t("Perdón | por | ser | tan | lenta. | Aquí | todos | son | más | rápidos | que | yo.", "Sorry | for | being | so | slow. | Here | everyone | are | more | fast | than | me.",
        "Sorry I'm so slow. Everyone here is faster than me."),
    ],
    mia_slow_again: [t("Es que... | no quiero | quedar | mal | con | el | chef.", "It's that... | I don't want | to end up | bad | with | the | chef.", "It's just… I don't want to let Chef down.")],
    mia_rush_react: [t("Ya | sé. | Hago | lo que | puedo.", "Already | I-know. | I-do | what | I-can.", "I know. I'm trying.")],
    mia_encouraged: [
      t("Bueno. | Gracias. | Lo | necesitaba.", "Okay. | Thanks. | It | I-needed.", "Okay. Thanks. I needed that."),
      t("Gracias. | La verdad, | eso | me | ayuda | mucho.", "Thanks. | The truth, | that | me | helps | a lot.", "Thanks. That actually helps a lot."),
    ],
    mia_try_harder: [t("Bueno. | Me | voy | a | esforzar | más.", "Okay. | (Myself) | I'm-going | to | push | more.", "Okay. I'll try harder.")],
    mia_twist: [t("Este... | ¿te | puedo | hacer | un | comentario | yo | también?", "Um... | (to) you | I-can | make | a | comment | I | too?", "Um… can I give you some feedback too?")],
    mia_twist2: [
      t("Probé | tu | chowder. | Una | cosa | que | podrías | probar | son | unas | gotitas | de | salsa | de | habanero.",
        "I-tasted | your | chowder. | One | thing | that | you-could | try | is | some | little drops | of | sauce | of | habanero.",
        "I tasted your chowder. One thing you could try is a few drops of habanero sauce.", { flags: { 8: "son: the verb agrees with the plural that follows." } }),
    ],
    // "¿En serio?" / "¿Habanero en un chowder?"
    mia_twist_really: [t("Sí, | en serio. | Nada más | unas | gotitas.", "Yes, | seriously. | Just | some | little drops.", "Yes, seriously. Just a few drops.")],
    mia_twist_thanks: [t("¿De veras? | ¿No te enojas?", "Really? | You're not mad?", "Really? You're not mad?")],
    mia_twist_fair: [t("Está bien. | Tu | plato. | Eso | dice | el | chef.", "Okay. | Your | plate. | That | says | the | chef.", "Fair enough. Your plate. That's what Chef says.")],
    mia_twist_defensive: [t("Ay. | Perdón. | Olvida | lo que | dije.", "Oh. | Sorry. | Forget | what | I-said.", "Oh. Sorry. Forget I said anything.")],
    mia_bye: [t("Gracias. | De veras.", "Thanks. | Really.", "Thank you. Really.")],

    // --- the global lines in tú: both cooks say tú to the learner (the shared copies switch by the NPC's flag)
    g_not_understood: [
      t("Perdón, | no te entendí.", "Sorry, | I didn't understand you.", "Sorry, I didn't understand you."),
      t("Perdón, | ¿puedes | repetir?", "Sorry, | can you | repeat?", "Sorry, could you say that again?"),
      t("Disculpa, | no entendí.", "Sorry, | I didn't understand.", "Sorry, I didn't understand."),
    ],
    g_yes_what: [t("¡Claro! | ¿En | qué | te | puedo | ayudar?", "Sure! | In | what | you | I-can | help?", "Sure! How can I help you?")],
    g_soundcheck: [
      t("Perdón, | ¿{X}?", "Sorry, | {X}?", "Sorry, {X}?"),
      t("Perdón, | ¿dijiste | {X}?", "Sorry, | did you say | {X}?", "Sorry, did you say {X}?"),
    ],
    g_soundcheck_no: [
      t("¡Ay, | perdón! | ¿Me | lo | repites?", "Oh, | sorry! | (To) me | it | you-repeat?", "Oh, sorry! Could you say it again?"),
      t("¡Me equivoqué! | ¿Qué | dijiste?", "My mistake! | What | did you say?", "My mistake! What did you say?"),
    ],
    g_slow_intro: [
      t("Claro, | te | hablo | más despacio.", "Sure, | (to) you | I'll-speak | more slowly.", "Sure, I'll speak more slowly."),
      t("Por supuesto. | Lo | digo | despacio.", "Of course. | It | I'll-say | slowly.", "Of course. I'll say it slowly."),
    ],
    g_learning: [
      t("¡No hay problema! | Hablas | muy | bien | español.", "No problem! | You speak | very | well | Spanish.", "No problem! Your Spanish is really good."),
      t("¡Está bien! | Lo | estás | haciendo | muy | bien.", "That's okay! | It | you're | doing | very | well.", "That's okay! You're doing great."),
    ],
    g_speak_slowly: [
      t("Hablo | despacio.", "I'll-speak | slowly.", "I'll speak slowly."),
      t("Te | hablo | más despacio.", "(To) you | I'll-speak | more slowly.", "I'll speak more slowly."),
    ],
    g_take_time: [
      t("Claro, | tómate tu tiempo.", "Sure, | take your time.", "Sure, take your time."),
      t("Sin prisa.", "No rush.", "No rush."),
      t("Tómate tu tiempo.", "Take your time.", "Take your time."),
    ],
    g_no_worries: [
      t("¡No pasa nada!", "No worries!", "No worries!"),
      t("¡Está bien!", "That's okay!", "That's okay!"),
      t("¡No te preocupes!", "Don't worry!", "Don't worry!"),
    ],
    g_howareyou_reply: [
      t("Bien, | gracias. | ¿Y | tú?", "Good, | thanks. | And | you?", "Good, thanks. And you?"),
      t("Muy | bien, | gracias. | ¿Y | tú?", "Very | well, | thanks. | And | you?", "Very well, thanks. And you?"),
    ],
    g_meaning: [
      t("¡Buena | pregunta! | Déjame | mostrarte.", "Good | question! | Let me | show you.", "Good question! Let me show you."),
      t("Mira, | te | explico.", "Look, | (to) you | I'll-explain.", "Here, let me explain."),
    ],
    g_write: [
      t("Claro, | aquí tienes.", "Sure, | here you go.", "Sure, here you go."),
      t("No hay problema, | aquí tienes.", "No problem, | here you go.", "No problem, here you go."),
    ],
    g_welcome: [
      t("¡De nada!", "You're welcome!", "You're welcome!"),
      t("¡Con gusto!", "My pleasure!", "My pleasure!"),
      t("¡No hay de qué!", "Don't mention it!", "Don't mention it!"),
    ],
  },

  hints: {
    // to the chef: usted (he says tú)
    serve: {
      lt: "Ask the chef to taste your chowder",
      items: [
        { id: "could_taste", s: t("Chef, | ¿lo | puede | probar?", "Chef, | it | can-you | taste?", "Chef, could you taste this?"), register: "polite", note: F_USTED },
        { id: "would_mind", s: t("¿Le | importaría | probarlo?", "(To) you | would-it-matter | to taste it?", "Would you mind tasting it?") },
        { id: "love_feedback", s: t("Me encantaría | saber | su | opinión.", "I'd love | to know | your | opinion.", "I'd love your feedback.") },
        { id: "heres_soup", s: t("Aquí | está | mi | chowder | de | pescado.", "Here | is | my | chowder | of | fish.", "Here's my fish chowder.") },
        { id: "its_ready", s: t("Ya | está | listo, | chef.", "Already | it-is | ready, | Chef.", "It's ready, Chef.") },
        { id: "what_think", s: t("¿Qué | le | parece?", "What | (to) you | does-it-seem?", "What do you think?") },
      ],
    },
    nerves: {
      lt: "Say you're nervous",
      items: [
        { id: "nervous", s: t("Estoy | un | poco | {m:nervioso|f:nerviosa}.", "I-am | a | little | nervous.", "I'm a little nervous.") },
        { id: "dont_laugh", s: t("No se ría, | por favor.", "Don't laugh, | please.", "Please don't laugh.") },
      ],
    },
    consent: {
      lt: "Say yes to the feedback",
      items: [
        { id: "sure_go_ahead", s: t("Claro, | dígame.", "Sure, | tell me.", "Sure, go ahead.") },
        { id: "be_honest", s: t("Por supuesto. | Sea | honesto, | por favor.", "Of course. | Be | honest, | please.", "Of course. Please be honest.") },
        { id: "love_some", s: t("Sí, | me encantaría | escuchar | sus | comentarios.", "Yes, | I'd love | to hear | your | comments.", "Yes, I'd love some feedback.") },
        { id: "can_take", s: t("Dígamelo | sin rodeos.", "Tell it to me | straight.", "Give it to me straight."), note: "Sin rodeos: with no beating around the bush. You can take it." },
      ],
    },
    receive: {
      lt: "Take the feedback well",
      items: [
        { id: "thanks_helpful", s: t("Gracias, | me | sirve | mucho.", "Thanks, | (to) me | it-helps | a lot.", "Thanks, that's really helpful.") },
        { id: "work_on_that", s: t("Lo | voy | a | mejorar.", "It | I'm-going | to | improve.", "I'll work on that.") },
        { id: "makes_sense", s: t("Tiene | sentido.", "It-has | sense.", "That makes sense.") },
        { id: "thanks_for_fb", s: t("Gracias | por | los | comentarios.", "Thanks | for | the | comments.", "Thanks for the feedback.") },
        { id: "youre_right", s: t("Tiene | razón, | le falta | vida.", "You-have | reason, | it's missing | life.", "You're right, it's a bit flat.",
          { flags: { 1: "tener razón: to be right." } }) },
        { id: "appreciate", s: t("Le | agradezco | la | honestidad.", "(To) you | I-thank | the | honesty.", "I appreciate your honesty.") },
        { id: "see_what_mean", s: t("Ya | entiendo | lo que | quiere | decir.", "Now | I-understand | what | you-want | to say.", "I see what you mean.") },
      ],
    },
    example: {
      lt: "Ask for an example",
      items: [
        { id: "give_example", s: t("¿Me | puede | dar | un | ejemplo?", "(To) me | can-you | give | an | example?", "Could you give me an example?") },
        { id: "what_add", s: t("¿Qué | le | pondría | usted?", "What | (in) it | would-put | you?", "What would you add?") },
        { id: "what_mean", s: t("¿Qué | quiere | decir | con | acidez?", "What | you-want | to say | with | acidity?", "What do you mean by acid?") },
        { id: "like_what", s: t("¿Como | qué?", "Like | what?", "Like what?"), register: "casual" },
        { id: "maybe_lemon", s: t("¿Unas | gotas | de | limón?", "Some | drops | of | lime?", "Maybe a squeeze of lime?", { flags: { 3: F_LIME } }) },
      ],
    },
    again: {
      lt: "Ask him to taste it again",
      items: [
        { id: "taste_again", s: t("¿Lo | puede | probar | otra vez?", "It | can-you | taste | again?", "Could you taste it again?"),
          note: "The song's title says it to a friend: “Pruébalo otra vez.”" },
        { id: "better_now", s: t("¿Ya | está | mejor?", "Already | it-is | better?", "Is it better now?") },
        { id: "i_added", s: t("Le | puse | unas | gotas | de | limón.", "(In) it | I-put | some | drops | of | lime.", "I added a squeeze of lime.") },
      ],
    },
    second: {
      lt: "Agree, or politely keep your own way",
      items: [
        { id: "hadnt_thought", s: t("No lo había | pensado | así.", "I hadn't | thought (of it) | that way.", "I hadn't thought of it that way.") },
        { id: "good_idea", s: t("Buena | idea. | Lo | voy | a | probar.", "Good | idea. | It | I'm-going | to | try.", "Good idea. I'll try that.") },
        { id: "try_both", s: t("Lo | pruebo | de | las | dos | maneras.", "It | I'll-try | in | the | two | ways.", "I'll try it both ways.") },
        { id: "see_point", s: t("Entiendo | su | punto, | pero | prefiero | dejarlo | tradicional.", "I-understand | your | point, | but | I-prefer | to leave it | traditional.",
          "I see your point, but I'd like to keep it traditional."), note: "Disagree politely: first grant the other person's point, then say yours." },
        { id: "home_crackers", s: t("En | mi | país | lo | servimos | con | galletas | saladas | aparte.", "In | my | country | it | we-serve | with | crackers | salty | on the side.",
          "Back home we serve it with crackers on the side.") },
        { id: "rather_simple", s: t("Gracias, | pero | prefiero | dejarlo | sencillo.", "Thanks, | but | I-prefer | to leave it | simple.", "Thanks, but I'd rather keep it simple.") },
      ],
    },
    handoff: {
      lt: "Agree to help Fátima",
      items: [
        { id: "happy_to", s: t("Claro, | con mucho gusto.", "Sure, | with pleasure.", "Sure, I'd be happy to.") },
        { id: "of_course_chef", s: t("Por supuesto, | chef.", "Of course, | Chef.", "Of course, Chef.") },
        { id: "where_she", s: t("Claro. | ¿Dónde | está?", "Sure. | Where | is-she?", "Sure. Where is she?") },
      ],
    },
    // to Fátima: tú
    mia_open: {
      lt: "Ask if you can taste it and give feedback",
      items: [
        { id: "can_i_give", s: t("¿Te | puedo | hacer | unos | comentarios?", "(To) you | I-can | make | some | comments?", "Can I give you some feedback?"),
          note: "The chef's own question, now from you." },
        { id: "let_me_taste", s: t("A ver, | déjame | probarlo.", "Let's see, | let me | taste it.", "Here, let me taste it.") },
        { id: "chef_asked", s: t("El | chef | me | pidió | que | lo | probara.", "The | chef | (of) me | asked | that | it | I-taste.", "Chef asked me to taste it.",
          { flags: { 3: "pedir que + past subjunctive: asked me to …" } }) },
      ],
    },
    mia_calm: {
      lt: "Calm Fátima down",
      items: [
        { id: "dont_worry", s: t("No te preocupes, | seguro | está | rico.", "Don't worry, | surely | it's | tasty.", "Don't worry, I'm sure it's good.", { flags: { 3: F_RICO } }) },
        { id: "smells_great", s: t("¡Huele | delicioso!", "It-smells | delicious!", "It smells great!") },
        { id: "no_stress", s: t("Tranquila. | Es | solo | un | ceviche.", "Relax. | It's | only | a | ceviche.", "Relax. It's just ceviche.") },
      ],
    },
    mia_worked: {
      lt: "Tell Fátima what worked", slot: "good_part", examples: ["pescado", "camaron", "aguacate", "cilantro"],
      items: [
        { id: "worked_well", s: t("Lo que | te | quedó | muy | bien | fue | {X.the}.", "What | (for) you | turned-out | very | well | was | {X.the}.", "What worked really well was {X.the}.",
          { flags: { 1: F_TE } }), note: "From the song: first say what worked." },
        { id: "really_like", s: t("Me gusta | mucho | {X.the}.", "I like | a lot | {X.the}.", "I really like {X.the}.") },
        { id: "nailed", s: t("Te | quedó | {perfecto@X} | {X.the}.", "(For) you | turned-out | perfect | {X.the}.", "You nailed {X.the}.", { flags: { 0: F_TE } }), register: "casual" },
        { id: "x_great", s: t("¡Qué | {rico@X} | está | {X.the}!", "How | tasty | is | {X.the}!", "Wow, {X.the} is so good!"), only: (e) => !!e.attrs?.food },
        { id: "x_great", s: t("¡Qué | {bonito@X} | está | {X.the}!", "How | pretty | is | {X.the}!", "Wow, {X.the} looks great!"), only: (e) => !!e.attrs?.looks },
        { id: "x_great", s: t("¡Qué | {bueno@X} | está | {X.the}!", "How | good | is | {X.the}!", "Wow, {X.the} is great!"), only: (e) => !e.attrs?.food && !e.attrs?.looks },
        { id: "really_good", s: t("Está | muy | rico, | Fátima.", "It's | very | tasty, | Fátima.", "It's really good, Fátima.", { flags: { 2: F_RICO } }) },
        { id: "great_job", s: t("Buen | trabajo, | Fátima.", "Good | work, | Fátima.", "Great job, Fátima.") },
        { id: "love_it", s: t("¡Me encanta!", "I love it!", "I love it!") },
      ],
    },
    mia_try: {
      lt: "Suggest one thing to try", slot: "ingredient", examples: ["sal", "limon", "cilantro", "aguacate"],
      items: [
        { id: "one_thing", s: t("Una | cosa | que | podrías | probar | es | un | poquito | de | {X}.", "One | thing | that | you-could | try | is | a | little | of | {X}.",
          "One thing you could try is a little {X}."), note: "From the song: after the praise, one thing to try." },
        { id: "thought_about", s: t("¿Has | pensado | en | ponerle | {X}?", "Have-you | thought | about | putting-in | {X}?", "Have you thought about adding {X}?") },
        { id: "id_suggest", s: t("Yo | le | pondría | un | poco | más | de | {X}.", "I | (in) it | would-put | a | little | more | of | {X}.", "I'd add a little more {X}.") },
        { id: "what_about", s: t("¿Qué tal | un | poquito | de | {X}?", "How about | a | little | of | {X}?", "What about a little {X}?") },
        { id: "could_add", s: t("Podrías | ponerle | un | poquito | de | {X}.", "You-could | put-in | a | little | of | {X}.", "You could add a little {X}.") },
        { id: "falta_sal", s: t("Le falta | una | pizca | de | sal.", "It's missing | a | pinch | of | salt.", "It needs a pinch of salt."), note: "Le falta…: it needs, it's missing." },
        { id: "seeds", s: t("Está | muy | picante: | quítale | las | semillas | al | chile.", "It's | very | spicy: | take out | the | seeds | from the | chili.", "It's very spicy: take the seeds out of the chili.") },
      ],
    },
    mia_howmuch: {
      lt: "Say how much to add",
      items: [
        { id: "just_little", s: t("Nada más | un | poquito.", "Just | a | little.", "Just a little.") },
        { id: "just_pinch", s: t("Una | pizca, | nada más.", "A | pinch, | just.", "Just a pinch.") },
        { id: "start_little", s: t("Empieza | con | poquito | y | vuelve | a | probar.", "Start | with | a little | and | go-back | to | taste.", "Start with a little, then taste it again.") },
        { id: "little_at_time", s: t("Poco a poco.", "Little by little.", "A little at a time.") },
      ],
    },
    mia_encourage: {
      lt: "Encourage Fátima",
      items: [
        { id: "get_there", s: t("Ya | lo | vas | a | lograr.", "Soon | it | you're-going | to | manage.", "You'll get there.", { flags: { 0: "ya with a future: you'll see." } }),
          note: "From the song. In Mexico you'll also hear “¡Échale ganas!”: keep at it." },
        { id: "first_week", s: t("No te preocupes, | es | tu | primera | semana.", "Don't worry, | it's | your | first | week.", "Don't worry, it's your first week.") },
        { id: "slow_too", s: t("Yo | también | era | {m:lento|f:lenta} | al principio.", "I | also | was | slow | at first.", "I was slow at first too.") },
        { id: "doing_great", s: t("Lo | estás | haciendo | muy | bien.", "It | you're | doing | very | well.", "You're doing great.") },
        { id: "comes_time", s: t("La | rapidez | llega | con | el | tiempo.", "The | speed | comes | with | the | time.", "Speed comes with time.") },
      ],
    },
    mia_back: {
      lt: "Take Fátima's feedback",
      items: [
        { id: "thanks_mia", s: t("Gracias, | Fátima. | Me | sirve | mucho.", "Thanks, | Fátima. | (To) me | it-helps | a lot.", "Thanks, Fátima. That's really helpful.") },
        { id: "good_point", s: t("Buen | punto. | Lo | voy | a | probar.", "Good | point. | It | I'm-going | to | try.", "Good point. I'll try it.") },
        { id: "hadnt_that", s: t("No lo había | pensado.", "I hadn't | thought (of it).", "I hadn't thought of that.") },
      ],
    },
    closing: {
      lt: "Say goodbye to the chef",
      items: [
        { id: "yes_chef", s: t("¡Sí, | chef!", "Yes, | Chef!", "Yes, Chef!"), note: "In a kitchen you answer the chef with “¡Sí, chef!”" },
        { id: "heard", s: t("¡Entendido, | chef!", "Understood, | Chef!", "Heard, Chef!") },
        { id: "thanks_today", s: t("Gracias | por | lo de hoy, | chef.", "Thanks | for | today, | Chef.", "Thanks for today, Chef.") },
      ],
    },
  },

  tips: {
    bossy: { key: "bossy", lt: "Understood! To the head chef a bare command sounds like an order. Ask instead, and add “chef”.", better: "Chef, ¿lo puede probar?" },
    defensive: { key: "defensive", lt: "Understood! Defending the dish right away sounds as if you aren't listening. Say thanks first; you can give your view later, calmly.", better: "Gracias, me sirve mucho." },
    polite_disagree: { key: "polite_disagree", lt: "Understood! You can disagree, but politely: first grant the other person's point (“Entiendo su punto, pero…”), then say what you'd like to keep.", better: "Entiendo su punto, pero prefiero dejarlo tradicional." },
    blunt_bad: { key: "blunt_bad", lt: "Understood! Said like that to a beginner, she'll just get scared and learn nothing. Start with what worked, then suggest one concrete thing.", better: "Lo que te quedó muy bien fue el pescado." },
    you_must: { key: "you_must", lt: "Understood! “Tienes que…” sounds like an order. Advice sounds softer with “podrías” or “yo le pondría”.", better: "Podrías ponerle un poquito de sal." },
    not_bad: { key: "not_bad", lt: "Understood! To a nervous beginner, “no está mal” sounds lukewarm, as if you didn't like it. Say what you liked.", better: "¡Está muy rico, Fátima!" },
    calm_down: { key: "calm_down", lt: "Understood! “Cálmate” often sounds like a reproach, as if she were overreacting. Softer: “No te preocupes” or “Tranquila”.", better: "No te preocupes, seguro está rico." },
    rush: { key: "rush", lt: "Understood! Maybe so, but right now Fátima needs encouragement more than hurrying. Speed comes with time.", better: "No te preocupes. Ya lo vas a lograr." },
  },

  merges: {
    "a ver": { reason: "lexical_expression", split: "a → to + ver → see; the formula = let's see.", minimal: "Two words." },
    "así como está": { reason: "lexical_expression", split: "así → so + como → as + está → it is; = as it is, right now.", minimal: "Three words." },
    "en su punto": { reason: "lexical_expression", split: "en → in + su → its + punto → point is false; = cooked just right.", minimal: "Three words." },
    "me explico": { reason: "grammatical_fusion", split: "me → myself + explico → I explain; explicarse = make oneself clear.", minimal: "Two words." },
    "por ejemplo": { reason: "lexical_expression", split: "por → by + ejemplo → example; = for example.", minimal: "Two words." },
    "más bien": { reason: "lexical_expression", split: "más → more + bien → well is false; = rather.", minimal: "Two words." },
    "así sí": { reason: "lexical_expression", split: "así → like that + sí → yes; the approval = that's it, now we're talking.", minimal: "Two words." },
    "de verdad": { reason: "lexical_expression", split: "de → of + verdad → truth; = real, really.", minimal: "Two words." },
    "de veras": { reason: "lexical_expression", split: "de → of + veras → truths; = really.", minimal: "Two words." },
    "en serio": { reason: "lexical_expression", split: "en → in + serio → serious; = seriously, really.", minimal: "Two words." },
    "te lo": { reason: "grammatical_fusion", split: "te → to you + lo → it; two object pronouns before the verb = it to you.", minimal: "Two words." },
    "se lo": { reason: "grammatical_fusion", split: "se → (oneself) + lo → it; comerse lo = eat it up.", minimal: "Two words." },
    "se hace": { reason: "grammatical_fusion", split: "Impersonal se: se hace = it's done.", minimal: "Two words." },
    "te vas": { reason: "grammatical_fusion", split: "te → yourself + vas → you go; irse = leave.", minimal: "Two words." },
    "es que": { reason: "lexical_expression", split: "es → it is + que → that; the excuse opener = it's just that.", minimal: "Two words." },
    "la verdad": { reason: "lexical_expression", split: "la → the + verdad → truth; the sentence adverb = honestly, actually.", minimal: "Two words." },
    "más tarde": { reason: "lexical_expression", split: "más → more + tarde → late; = later.", minimal: "Two words." },
    "poco a poco": { reason: "lexical_expression", split: "poco → little + a → to + poco → little; = little by little.", minimal: "Three words." },
    "al principio": { reason: "lexical_expression", split: "al → at the + principio → beginning; = at first.", minimal: "Two words." },
    "sin rodeos": { reason: "lexical_expression", split: "sin → without + rodeos → detours; = straight, no beating around the bush.", minimal: "Two words." },
    "con mucho gusto": { reason: "lexical_expression", split: "con → with + mucho → much + gusto → pleasure; the polite yes = I'd be happy to.", minimal: "Three words." },
    "lo de hoy": { reason: "lexical_expression", split: "lo → the (thing) + de → of + hoy → today; = today (what happened today).", minimal: "Three words." },
    "me encantaría": { reason: "grammatical_fusion", split: "me → to me + encantaría → would delight; = I'd love to.", minimal: "Two words." },
    "los dos": { reason: "lexical_expression", split: "los → the + dos → two; = both of you (a man and a woman).", minimal: "Two words." },
    "las dos": { reason: "lexical_expression", split: "las → the + dos → two; = both of you (two women).", minimal: "Two words." },
    "no está mal": { reason: "lexical_expression", split: "no → not + está → is + mal → bad: the quoted phrase “not bad” as a whole.", minimal: "Three words." },
    "de acuerdo": { reason: "lexical_expression", split: "de → of + acuerdo → agreement; estar de acuerdo = agree.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    // items 1, 3 and 4: not needed for the course report; they leave the list once their moment has passed
    { lt: "Ask the chef to taste your chowder", optional: true, done: (c) => !!c.s.offered, when: (c) => !c.s.goalMet && !c.s.served },
    { lt: "Take the feedback: thank him and say you'll work on it", done: (c) => !!c.s.received },
    { lt: "Ask for an example", optional: true, done: (c) => !!c.s.exAsked, when: (c) => !c.s.goalMet && !c.s.exampleDone },
    { lt: "Answer the chef's idea (agree, or politely keep your way)", optional: true, done: (c) => !!c.s.secondAns, when: (c) => !c.s.goalMet && !c.s.secondDone },
    { lt: "Tell Fátima what worked", done: (c) => !!c.s.praised },
    { lt: "Suggest one thing to try", done: (c) => !!c.s.tried },
    { lt: "Encourage Fátima", done: (c) => !!c.s.encouraged },
  ],

  steps: [
    { id: "serve", done: (c) => !!c.s.served,
      ask: (c) => {
        const n = bump(c, "serve");
        if (n === 1) { C(c, c.s.greetBack ? "greet_back" : "greet"); return; }
        if (n === 2) { C(c, "serve_again"); return; }
        // the third time the chef takes the bowl himself (item 1 not ticked)
        C(c, "serve_take"); serveDish(c, false, []); askNext(c);
      },
      expects: ["offer_taste", "nervous"],
      suggest: [{ lt: "Ask the chef to taste your chowder", hint: "serve" }, { lt: "Say you're nervous", hint: "nerves" }],
      // "¿Y? ¿Me vas a dejar probarlo…?" – "Sí." / "No."
      yes: (c) => { if (asks(c, "serve") >= 2) serveDish(c, true, []); },
      no: (c) => { if (asks(c, "serve") >= 2) { C(c, "serve_take"); serveDish(c, false, []); } },
      help: (c) => { C(c, "serve_take"); serveDish(c, false, []); askNext(c); } },
    { id: "consent", when: (c) => !!c.s.served && !c.s.fbAsked, done: (c) => !!c.s.consented,
      ask: (c) => { bump(c, "consent"); C(c, "ask_consent"); },
      expects: ["want_feedback", "no_feedback", "nervous"],
      suggest: [{ lt: "Say yes to the feedback", hint: "consent" }],
      yes: (c) => { c.s.consented = true; },
      no: (c) => { refuse(c); },
      help: (c) => { C(c, "consent_no2"); c.s.consented = true; askNext(c); } },
    { id: "receive", when: (c) => !!c.s.served && (!!c.s.consented || !!c.s.fbAsked), done: receiveDone,
      ask: (c) => {
        const n = bump(c, "receive");
        if (!c.s.fbGiven) { c.s.fbGiven = true; C(c, "feedback1a"); C(c, "feedback1b"); return; }
        if (n >= 4) { c.s.recvSkip = true; C(c, "receive_skip"); askNext(c); return; }
        // "¿Y? ¿Qué opinas?", then "No tienes que estar de acuerdo…" (the same question twice in a row read as a loop)
        recvAsk(c, n === 2 ? "receive_again" : "receive_help");
      },
      expects: ["thanks_helpful", "will_work", "defensive", "ask_example"],
      suggest: [{ lt: "Thank him and say you'll work on it", hint: "receive" }, { lt: "Ask for an example", hint: "example" }],
      yes: (c) => { receiveWell(c, "ok"); },
      no: (c) => { defend(c, []); },
      help: (c) => { recvAsk(c, "receive_help"); } },
    { id: "example", when: receiveDone, done: (c) => !!c.s.exampleDone,
      ask: (c) => {
        const n = bump(c, "example");
        c.s.exQ = n === 1 ? c.pick(["sense", "questions"]) : c.s.exQ === "sense" ? "questions" : "sense";
        C(c, c.s.exQ === "sense" ? "example_sense" : "example_questions");
      },
      expects: ["ask_example", "guess_lemon", "no_questions"],
      suggest: [{ lt: "Ask for an example", hint: "example" }],
      // "¿Alguna duda?" – "Sí." invites the question; "¿Me explico?" – "No." gets the example at once
      yes: (c) => { if (c.s.exQ === "questions") { C(c, "go_ahead"); c.hold(); } else exampleNo(c); },
      no: (c) => { exampleNo(c, c.s.exQ === "sense"); },
      help: (c) => { exampleNo(c, true); } },
    { id: "again", when: (c) => receiveDone(c) && !!c.s.exampleDone, done: (c) => !!c.s.againDone,
      ask: (c) => {
        const n = bump(c, "again");
        if (n === 1) { C(c, "again_prompt"); return; }
        tasteAgain(c, true); askNext(c);
      },
      expects: ["ask_again", "again_ctx", "nervous"],
      suggest: [{ lt: "Ask him to taste it again", hint: "again" }],
      yes: (c) => { tasteAgain(c, true); }, no: (c) => { tasteAgain(c, true); },
      help: (c) => { tasteAgain(c, true); askNext(c); } },
    { id: "second", when: (c) => !!c.s.againDone, done: (c) => !!c.s.secondDone,
      ask: (c) => {
        const n = bump(c, "second");
        if (n === 1) { C(c, "second_ask"); return; }
        // "¿con tortilla o sin tortilla?" once (twice in a row read as a loop); then "Piénsalo."
        if (n === 2) { C(c, "second_reask"); return; }
        C(c, "second_skip"); c.s.secondDone = true; askNext(c);
      },
      expects: ["accept_idea", "keep_own", "reject_rude", "second_ctx", "thanks_helpful", "will_work"],
      suggest: [{ lt: "Agree, or politely keep your own way", hint: "second" }],
      yes: (c) => { secondAnswer(c, "accept"); },
      // "No, gracias." / "Así está bien." keep the chowder as it is; a bare "No." is blunt
      no: (c) => { secondAnswer(c, POLITE_NO.test(heard(c)) ? "keep" : "rude"); },
      help: (c) => { C(c, "both_ways"); c.s.secondDone = true; askNext(c); } },
    { id: "handoff", when: (c) => !!c.s.secondDone, done: (c) => !!c.s.handoffDone,
      ask: (c) => {
        // a "no, pero…" that no yes took back
        if (NO_LATER.has(c)) { NO_LATER.delete(c); helpNoSay(c); if (c.s.handoffDone) { askNext(c); return; } }
        const n = bump(c, "handoff");
        if (n === 1) { C(c, "handoff1"); C(c, "handoff2"); C(c, "handoff3"); return; }
        if (n <= 2) { C(c, "handoff_again"); return; }
        callMia(c, "anyway"); askNext(c);
      },
      expects: ["help_yes", "help_yes_ctx", "help_no", "help_unsure_ctx", "help_why_ctx", "help_who_ctx"],
      suggest: [{ lt: "Agree to help Fátima", hint: "handoff" }],
      yes: (c) => { callMia(c, "yes"); }, no: (c) => { helpNo(c, true); },
      // "No sé" (or a "no, pero…" still waiting): one no this turn
      help: (c) => {
        if (NO_LATER.has(c)) NO_LATER.delete(c); else if (!once(c, "helpNo")) return;
        helpNoSay(c); if (c.s.handoffDone) askNext(c);
      } },
    { id: "mia_open", when: (c) => !!c.s.handoffDone, done: (c) => !!c.s.miaOpen,
      ask: (c) => {
        const n = bump(c, "mia_open");
        if (n === 1) { c.s.miaHiKind = c.pick(["terrible", "nice"]); M(c, c.s.miaHiKind === "terrible" ? "mia_hi" : "mia_hi_nice"); return; }
        // asked once; then she holds the plate out ("¿Lo... quieres probar?" twice in a row read as a loop)
        if (!c.s.waitAsked) { c.s.waitAsked = true; M(c, "mia_wait"); return; }
        miaHere(c); askNext(c);
      },
      expects: ["offer_feedback", "reassure", "calm_down", "intro_mia_ctx", "nice_meet", "ask_recipe"],
      suggest: [{ lt: "Ask if you can taste it and give feedback", hint: "mia_open" }, { lt: "Calm Fátima down", hint: "mia_calm" }],
      yes: (c) => { if (c.s.miaHiKind === "terrible" && asks(c, "mia_open") === 1 && /^\W*(si|claro)\W*$/.test(heard(c))) M(c, "mia_oye"); miaReady(c); },
      // "No" to "Seguro está horrible": it isn't; to "¿Lo... quieres probar?" (asked from the second time): she holds
      // the plate out anyway ("Ten. Nada más pruébalo."), never a thank-you or "Sí, sé honesto"
      no: (c) => {
        if (c.s.waitAsked && !c.s.miaOpen) { if (once(c, "here")) miaHere(c); return; }
        reassure(c);
      },
      help: (c) => { if (c.s.waitAsked) { miaHere(c); askNext(c); } else { c.s.waitAsked = true; M(c, "mia_wait"); } } },
    { id: "mia_worked", when: (c) => !!c.s.miaOpen, done: praiseDone,
      ask: (c) => {
        const n = bump(c, "mia_worked");
        // the learner tastes the ceviche; Fátima waits (her face says the rest) unless she already flinched
        tasteCeviche(c);
        if (n === 1 && !c.s.miaQ) return;
        if (n >= 5) { c.s.praiseSkip = true; askNext(c); return; }
        c.s.miaQ = "ask_good"; M(c, "mia_ask_good");
      },
      expects: ["praise_part", "praise_general", "praise_short_ctx", "good_ctx", "other_food_ctx", "blunt_bad", "problem_state", "ask_recipe"],
      suggest: [{ lt: "Tell Fátima what worked", hint: "mia_worked", options: "good_part" }],
      // "¿Hay algo bueno?" – "Sí." → "¿De veras? ¿Qué?"; "¿Te gustó o no?" – "Sí." is praise
      // ("¿De veras? ¿Qué?" – "Sí." again: that's all she gets, praise in general)
      yes: (c) => {
        if (c.s.miaQ === "which" || c.s.miaQ === "what") { c.s.miaQ = undefined; praise(c, undefined); return; }
        if (c.s.miaQ === "ask_good") { c.s.miaQ = "what"; M(c, "mia_what"); c.hold(); }
      },
      no: (c) => { if (c.s.miaQ === "ask_good" || c.s.miaQ === "which" || c.s.miaQ === "what") blunt(c); },
      help: (c) => { c.s.miaQ = "ask_good"; M(c, "mia_ask_good"); } },
    { id: "mia_try", when: praiseDone, done: tryDone,
      ask: (c) => {
        const n = bump(c, "mia_try");
        // what the learner just said decides how she asks (a fix in the same breath skips this question)
        if (c.s.probNow) { c.s.probNow = false; tryAsk(c, "mia_problem_react"); return; }
        if (c.s.flinch) { c.s.flinch = false; tryAsk(c, "mia_what_do"); return; }
        // "Nada, está perfecto": "Hay algo, ¿verdad?" (asked just now already: she gives up for now)
        if (c.s.noFixNow) { c.s.noFixNow = false; if (c.s.tryLast === "mia_something") { tryGiveUp(c); askNext(c); } else tryAsk(c, "mia_something"); return; }
        if (n === 1 && c.s.problemOpen) { tryAsk(c, "mia_problem_back"); return; }
        if (n >= 4) { tryGiveUp(c); askNext(c); return; }
        tryAsk(c, n === 2 ? "mia_something" : "mia_bad_news");
      },
      expects: ["suggest_fix", "suggest_other", "suggest_unknown", "suggest_not", "problem_state", "blunt_bad", "no_fix", "ask_recipe"],
      suggest: [{ lt: "Suggest one thing to try", hint: "mia_try", options: "ingredient" }],
      no: (c) => { noFix(c); },
      help: (c) => { tryAsk(c, "mia_something"); } },
    { id: "mia_howmuch", when: (c) => !!c.s.tried && !!c.s.howMuch && !!c.s.fix && !c.s.amountGiven, done: (c) => !!c.s.howMuchDone,
      ask: (c) => {
        const n = bump(c, "mia_howmuch");
        if (n === 1) { M(c, "mia_howmuch"); return; }
        howMuchUnsure(c); askNext(c);
      },
      expects: ["howmuch_ans"],
      suggest: [{ lt: "Say how much to add", hint: "mia_howmuch" }],
      yes: (c) => { howMuchUnsure(c); }, no: (c) => { howMuchUnsure(c); },
      help: (c) => { howMuchUnsure(c); askNext(c); } },
    { id: "mia_encourage", when: tryDone, done: encDone,
      ask: (c) => {
        const n = bump(c, "mia_encourage");
        if (n === 1) { encAsk(c, "mia_slow"); return; }
        // "Es que... no quiero quedar mal con el chef." once; then she gives up (it came twice in a row after a rush)
        if (n === 2 && c.s.encLast !== "mia_slow_again") { encAsk(c, "mia_slow_again"); return; }
        c.s.encSkip = true; M(c, "mia_try_harder"); askNext(c);
      },
      expects: ["encourage", "encourage_ctx", "reassure", "calm_down", "rush"],
      suggest: [{ lt: "Encourage Fátima", hint: "mia_encourage" }],
      // "Perdón por ser tan lenta." – "Sí." agrees she is slow; "No." means she isn't
      yes: (c) => { rush(c, true); }, no: (c) => { encourage(c); },
      help: (c) => { encAsk(c, c.s.encLast === "mia_slow_again" ? "mia_slow" : "mia_slow_again"); } },
    // Twist: Fátima gives the learner feedback (no mission item).
    { id: "mia_back", when: (c) => encDone(c) && !!c.s.backTwist, done: (c) => !!c.s.backDone,
      ask: (c) => {
        const n = bump(c, "mia_back");
        if (n === 1) { c.twist("mia_feedback"); M(c, "mia_twist"); M(c, "mia_twist2"); return; }
        // "¿En serio?": once, and she waits
        if (SURPRISE.has(c)) { SURPRISE.delete(c); if (!c.s.surpriseSaid) { c.s.surpriseSaid = true; M(c, "mia_twist_really"); return; } }
        // anything else: Fátima takes it as a yes
        twistThanks(c, true); askNext(c);
      },
      expects: ["thanks_helpful", "will_work", "accept_idea", "keep_own", "defensive", "reject_rude", "twist_surprise_ctx"],
      suggest: [{ lt: "Take Fátima's feedback", hint: "mia_back" }],
      yes: (c) => { twistThanks(c, true); }, no: (c) => { if (POLITE_NO.test(heard(c))) twistFair(c); else twistDefensive(c); },
      help: (c) => { twistFair(c); } },
  ],

  init: (c) => {
    c.s.asks = {};
    c.s.backTwist = c.visits >= 1 ? c.chance(0.6) : c.chance(0.25);
    c.s.howMuch = c.chance(0.6);
    c.s.greetBack = !!c.memory.pierChef && c.chance(0.5);
  },

  start: () => { /* the serve step greets */ },

  handlers: {
    // --- the chowder ---
    offer_taste(c, _slots, seg) {
      const fb = seg.tags.includes("fb");
      if (!c.s.served) { if (once(c, "offer")) serveDish(c, true, seg.tags); return; }
      // "¿Lo puede probar? Me encantaría saber su opinión." (the second piece asks for the feedback)
      if (fb && !c.s.consented && !c.s.fbGiven) { if (c.step === "consent") c.s.consented = true; else c.s.fbAsked = true; return; }
      if (c.step === "again" || (c.s.exampleDone && !c.s.againDone && receiveDone(c))) { tasteAgain(c, false); return; }
    },
    // "No está mejor" at the second taste: the chef just tastes it (the step does)
    nervous(c, _slots, seg) {
      if (seg.tags.includes("notyet") && c.s.served) return;
      if (once(c, "nervous") && !c.s.nervousSaid) { c.s.nervousSaid = true; C(c, "nervous_react"); }
    },
    want_feedback(c, _slots, seg) {
      if (!c.s.served) { if (once(c, "offer")) serveDish(c, true, [...seg.tags, "fb"]); return; }
      if (!c.s.consented && !c.s.fbAsked) { c.s.consented = true; return; }
      if (c.step === "mia_back") { twistThanks(c); return; }
      stepYes(c);
    },
    no_feedback(c) {
      if (c.step === "consent" || (c.s.served && !c.s.consented && !c.s.fbAsked)) { refuse(c); return; }
      if (c.step === "handoff") { helpNo(c); return; }
      if (c.step === "mia_back") { twistDefensive(c); return; }
    },

    // --- receiving ---
    thanks_helpful(c) {
      switch (c.step) {
        case "receive": receiveWell(c, "thanks"); return;
        case "example": exampleNo(c); return;
        case "again": tasteAgain(c, true); return;
        case "second": secondAnswer(c, "accept"); return;
        case "mia_back": twistThanks(c); return;
        // "Es cierto" to "Perdón por ser tan lenta": agreeing she's slow
        case "mia_encourage": if (/\b(cierto|verdad)\b/.test(heard(c))) { rush(c, true); return; } break;
      }
      if (c.s.fbGiven && !receiveDone(c)) { receiveWell(c, "thanks"); return; }
    },
    will_work(c, _slots, seg) {
      switch (c.step) {
        case "receive": receiveWell(c, "work"); return;
        case "example": if (seg.tags.includes("acid")) guessed(c); else exampleNo(c); return;
        case "again": tasteAgain(c, true); return;
        case "second": secondAnswer(c, "accept"); return;
        case "mia_back": twistThanks(c); return;
      }
      if (c.s.fbGiven && !receiveDone(c)) { receiveWell(c, "work"); return; }
    },
    defensive(c, _slots, seg) {
      // "Es una receta de mi abuela" before the tasting: the dish introduced
      if (!c.s.served) { if (once(c, "offer")) serveDish(c, true, []); return; }
      // "Así está bien" to Fátima's idea: polite, her way is kept
      if (c.step === "mia_back") { if (seg.tags.includes("fine")) twistFair(c); else twistDefensive(c); return; }
      // "No es cierto" to "Perdón por ser tan lenta": she isn't slow
      if (c.step === "mia_encourage") { if (/\bno es (cierto|verdad)\b/.test(heard(c))) encourage(c); return; }
      if (c.step === "second") { secondAnswer(c, "keep"); return; }
      if (c.s.fbGiven && !receiveDone(c)) { defend(c, seg.tags); return; }
      if (c.step === "consent") { refuse(c); return; }
    },
    ask_example(c) {
      // "¿Como qué?" is about the chowder only until the chef has tasted it again
      if (!c.s.fbGiven || c.s.againDone) return;
      if (!once(c, "example")) return;
      // asked again once the example is given ("¿Cuánto le pongo?", "¿Limón o vino blanco?"): a short reminder, and
      // he waits (the example word for word again, then tasting before anything was added, read wrong)
      if (c.s.exampleDone) { if (!c.s.hintSaid) { c.s.hintSaid = true; C(c, "again_hint"); c.hold(); } return; }
      c.s.exampleDone = true; c.s.exAsked = true;
      C(c, "example_give");
    },
    // "¿Le gustó?": before the feedback it asks for it; after it, a short answer; after the second taste, the board
    ask_liked(c) {
      if (c.s.handoffDone) return;
      if (!c.s.served) { if (once(c, "offer")) serveDish(c, true, ["fb"]); return; }
      if (!c.s.fbGiven) { c.s.consented = true; return; }
      if (!once(c, "liked")) return;
      if (c.s.againDone) { boardYes(c); return; }
      if (c.s.likedSaid) return;
      c.s.likedSaid = true; C(c, "liked_yes");
      if (c.step === "again") c.hold(); // he still waits for the lime
    },
    // "¿Lo puedo poner en el pizarrón?": not before the second taste
    ask_board(c) {
      if (c.s.handoffDone) return;
      if (!c.s.served) { if (once(c, "offer")) serveDish(c, true, []); return; }
      if (!c.s.fbGiven) { c.s.consented = true; return; }
      if (!once(c, "board")) return;
      if (c.s.againDone) { boardYes(c); return; }
      if (c.s.boardSaid) return;
      c.s.boardSaid = true; C(c, "board_not_yet");
      if (c.step === "again") c.hold();
    },
    no_questions(c) {
      // "No tengo dudas" / "Todo claro": he gives the example now (asking again would repeat the question)
      if (c.step === "example") { exampleNo(c, true); return; }
      if (c.step === "receive" || (c.s.fbGiven && !receiveDone(c))) { receiveWell(c, "ok"); return; }
      if (c.step === "mia_try") { noFix(c); return; }
      // "Nada." to "¿Hay algo bueno?": nothing is good
      if (c.step === "mia_worked" && (c.s.miaQ === "ask_good" || c.s.miaQ === "what") && !praiseDone(c)) { blunt(c); return; }
    },
    guess_lemon(c, _slots, seg) {
      if (c.step === "again" || (c.s.exampleDone && receiveDone(c) && !c.s.againDone)) { tasteAgain(c, true); return; }
      if (c.s.fbGiven && !c.s.exampleDone) {
        // "¿Más sal?": the salt is fine; he names the lime (the example is given)
        if (seg.tags.includes("salt")) { if (!once(c, "example")) return; c.s.exampleDone = true; c.s.exAsked = true; C(c, "example_salt"); return; }
        guessed(c);
      }
    },
    again_ctx(c) { if (c.s.exampleDone && !c.s.againDone) tasteAgain(c, false); },
    second_ctx(c, _slots, seg) { secondAnswer(c, seg.tags.includes("keep") ? "keep" : "accept"); },
    ask_again(c) {
      if (!c.s.served) { if (once(c, "offer")) serveDish(c, true, []); return; }
      if (c.s.exampleDone && !c.s.againDone) { tasteAgain(c, false); return; }
      // asked before the example: the chef gives it first
      if (c.s.fbGiven && !c.s.exampleDone) { exampleNo(c, true); return; }
    },

    // --- the tortilla strips ---
    accept_idea(c) {
      switch (c.step) {
        case "second": secondAnswer(c, "accept"); return;
        case "mia_back": twistThanks(c); return;
        case "receive": receiveWell(c, "thanks"); return;
        case "example": exampleNo(c); return;
      }
      if (c.s.againDone && !c.s.secondDone) { secondAnswer(c, "accept"); return; }
    },
    keep_own(c) {
      switch (c.step) {
        case "consent": refuse(c); return;
        case "handoff": helpNo(c); return;
        case "second": secondAnswer(c, "keep"); return;
        case "mia_back": twistFair(c); return;
        case "receive": defend(c, []); return;
      }
      if (c.s.againDone && !c.s.secondDone) { secondAnswer(c, "keep"); return; }
    },
    reject_rude(c) {
      switch (c.step) {
        case "second": secondAnswer(c, "rude"); return;
        case "mia_back": twistDefensive(c); return;
        case "receive": defend(c, []); return;
      }
      if (c.s.againDone && !c.s.secondDone) { secondAnswer(c, "rude"); return; }
    },

    // --- the favor ---
    help_yes(c) { if (c.step === "handoff") callMia(c, "yes"); else stepYes(c); },
    help_yes_ctx(c) { if (c.step === "handoff") callMia(c, "yes"); else stepYes(c); },
    help_unsure_ctx(c) {
      if (c.step !== "handoff" || c.s.handoffDone) return;
      if (once(c, "unsure")) C(c, "handoff_unsure");
      callMia(c, "yes");
    },
    help_why_ctx(c) { if (c.step === "handoff" && !c.s.handoffDone && !c.s.whySaid && once(c, "why")) { c.s.whySaid = true; C(c, "handoff_why"); } },
    help_who_ctx(c) { if (c.step === "handoff" && !c.s.handoffDone && !c.s.whoSaid && once(c, "who")) { c.s.whoSaid = true; C(c, "handoff_who"); } },
    help_no(c) {
      if (c.step === "handoff") { helpNo(c); return; }
      if (c.step === "consent") { refuse(c); return; }
    },

    // --- Fátima ---
    offer_feedback(c) {
      if (c.step === "handoff") { callMia(c, "yes"); return; }
      if (!c.s.handoffDone) return;
      if (!c.s.miaOpen) miaReady(c);
    },
    reassure(c) { reassure(c); },
    calm_down(c) {
      if (!inMia(c)) return;
      if (once(c, "calm")) M(c, "mia_calm_react");
      if (c.step === "mia_encourage") return; // "¡Estoy tranquila!": she still waits for a kind word
      reassure(c, true);
    },
    // "¿Qué lleva?": she lists it once; while she waits for the verdict or the idea, she keeps waiting
    ask_recipe(c) {
      if (!inMia(c) || !once(c, "recipe") || c.s.recipeSaid) return;
      c.s.recipeSaid = true; M(c, "mia_recipe");
      if (c.step !== "mia_open") c.hold();
    },
    // "¿En serio?" to her idea: "Sí, de veras…" where her question would come, so another piece of the same turn
    // ("En serio, no me gusta el picante") answers instead; "No, en serio" is a no
    twist_surprise_ctx(c) {
      if (c.step !== "mia_back" || c.s.backDone) return;
      if (/^no\b/.test(heard(c))) { if (POLITE_NO.test(heard(c))) twistFair(c); else twistDefensive(c); return; }
      SURPRISE.add(c);
    },
    intro_mia_ctx(c) { if (once(c, "nice") && !c.s.niceSaid) { c.s.niceSaid = true; M(c, "mia_nice"); } },
    nice_meet(c) { if (inMia(c) && once(c, "nice") && !c.s.niceSaid) { c.s.niceSaid = true; M(c, "mia_nice_too"); } },
    praise_part(c, slots, seg) {
      const part = slots.good ?? (seg.tags.find((x) => x.startsWith("pt:"))?.slice(3));
      praise(c, part);
    },
    good_ctx(c, slots, seg) {
      // "Todo." to "¿Qué?" / "¿Hay algo bueno?": everything
      if (seg.tags.includes("all")) { praise(c, undefined); return; }
      // "…pero no el cilantro": the part named after "no" is no praise
      if (negatedPart(c, slots.good)) { kitchen.handlers.problem_state(c, slots, seg); return; }
      praise(c, slots.good);
    },
    // "Me gusta mucho el aguacate" may come as "Me gusta mucho" + "el aguacate": the part named is the praise
    praise_general(c, _slots, seg) {
      // "Sí, me gusta." to the chef's tortilla strips: the idea is taken
      if (c.step === "second") { secondAnswer(c, "accept"); return; }
      praise(c, partNamed(c), seg.tags.includes("notbad"));
    },
    other_food_ctx(c, slots) {
      if (c.step !== "mia_worked" || !once(c, "praise")) return;
      M(c, other(slots.o)?.attrs?.bought ? "mia_bought" : "mia_other", { X: slots.o });
    },
    praise_short_ctx(c) { praise(c, undefined); },
    blunt_bad(c, _slots, seg) {
      if (!c.s.handoffDone) return;
      if (seg.tags.includes("amb")) {
        // before the tasting it answers "Seguro está horrible" ("No, está buenísimo"); after it, she asks which
        if (!c.s.miaOpen || c.step === "mia_open") { reassure(c); return; }
        if (c.step === "mia_worked" && !praiseDone(c) && once(c, "which")) { c.s.miaQ = "which"; M(c, "mia_which"); c.hold(); }
        return;
      }
      blunt(c);
    },
    problem_state(c, slots) {
      if (!c.s.handoffDone) return;
      // "No sé… me gusta el aguacate": the "no" belongs to "sé" (the engine may skip that "se"), so it's praise
      if (NO_SE_LIKE.test(heard(c)) && !/\bno me (gust|encant)/.test(heard(c))) { praise(c, slots.good); return; }
      // before saying what worked: Fátima flinches and asks if anything is good (the problem is remembered)
      if (!praiseDone(c)) {
        c.s.problemOpen = true;
        c.tip(TIPS.blunt_bad);
        if (!once(c, "problem")) return;
        c.s.miaOpen = true; c.s.miaQ = "ask_good";
        if (!c.s.flinched) { c.s.flinched = true; M(c, "mia_flinch"); }
        return;
      }
      if (tryDone(c)) { if (once(c, "problem")) M(c, "mia_fix_it"); return; }
      if (!once(c, "problem")) return;
      c.s.probCount = (c.s.probCount ?? 0) + 1;
      // a second problem without a fix: Fátima works it out herself (counts, as in the English)
      if (c.s.probCount >= 2 || c.s.problemOpen) { c.s.tried = true; c.s.fix = undefined; M(c, "mia_fix_it"); return; }
      c.s.probNow = true;
    },
    suggest_fix(c, slots, seg) { suggestion(c, slots.fix, seg.tags); },
    suggest_other(c, _slots, seg) { suggestion(c, undefined, seg.tags); },
    suggest_unknown(c, _slots, seg) { suggestion(c, undefined, seg.tags); },
    suggest_not(c, slots) {
      if (!inMia(c) || !once(c, "suggest") || c.s.noX === slots.fix) return;
      c.s.noX = slots.fix;
      M(c, "mia_no_x", { X: slots.fix });
    },
    no_fix(c) {
      if (c.step === "example") { exampleNo(c); return; }
      if (c.step === "mia_try" || (praiseDone(c) && !tryDone(c))) { noFix(c); return; }
      if (c.step === "mia_worked") {
        if (/\b(perfect[oa]|bien|ric[oa]|bueno)\b/.test(heard(c))) praise(c, undefined);
        else if ((c.s.miaQ === "ask_good" || c.s.miaQ === "what") && !praiseDone(c)) blunt(c);
        return;
      }
    },
    howmuch_ans(c, slots, seg) {
      // "Poco a poco" to "Perdón por ser tan lenta": encouragement
      if (c.step === "mia_encourage" && seg.tags.includes("gradual")) { encourage(c); return; }
      if (c.step === "mia_howmuch" || (c.s.tried && c.s.howMuch && c.s.fix && !c.s.howMuchDone && !c.s.amountGiven)) {
        if (!once(c, "howmuch")) return;
        c.s.howMuchDone = true;
        M(c, seg.tags.includes("gradual") ? "mia_howmuch_react" : "mia_howmuch_ok");
        return;
      }
      // "Una pizca de sal." while Fátima waits for an idea: that's the idea
      if (slots.fix && praiseDone(c) && !tryDone(c)) { suggestion(c, slots.fix, [...seg.tags, "amt"]); return; }
    },
    encourage(c) {
      // "Lo estás haciendo muy bien" while she asks what was good: that's praise
      if (c.step === "mia_worked" && c.s.miaOpen && !praiseDone(c)) { praise(c, undefined); return; }
      if (c.step === "mia_encourage" || (praiseDone(c) && tryDone(c) && !encDone(c))) { encourage(c); return; }
      if (c.step === "mia_open" || (c.step === "mia_worked" && !c.s.miaOpen)) { reassure(c); return; }
      if (c.step === "mia_back") { twistThanks(c); return; }
    },
    rush(c) { if (c.step === "mia_encourage" || (praiseDone(c) && tryDone(c) && !encDone(c))) rush(c, false); },
    encourage_ctx(c) { if (c.step === "mia_encourage") encourage(c); },

    // --- the goodbye (outside the closing question) ---
    yes_chef_ctx(c) { if (c.s.__finished) closeReply(c); else stepYes(c); },
    thanks_today(c) { if (c.s.__finished) closeReply(c); else kitchen.handlers.g_thanks(c, {}, { intent: "g_thanks", slots: {}, tags: [] } as unknown as Segment); },

    // --- global intents: the step decides what they mean here ---
    g_thanks(c) {
      switch (c.step) {
        case "receive": receiveWell(c, "thanks"); return;
        case "example": exampleNo(c); return;
        case "second": secondAnswer(c, "accept"); return;
        case "mia_back": twistThanks(c); return;
      }
      if (once(c, "welcome")) (inMia(c) ? M : C)(c, "g_welcome");
    },
    g_ok(c) {
      if (["consent", "receive", "example", "again", "second", "handoff", "mia_back"].includes(c.step ?? "")) stepYes(c);
    },
    g_hello(c) {
      if (inMia(c)) { if (!c.s.miaHi) { c.s.miaHi = true; M(c, "g_hello"); } return; }
      if (c.s.chefHi) return;
      c.s.chefHi = true; C(c, "g_hello");
      // "¡Hola!" at the start: the question "¿qué traes?" still stands
      if (c.step === "serve") c.hold();
    },
    // "No sé" / "No estoy seguro": the step's help, where its question would come (see the end of the file), so an
    // answer in the same breath wins ("No sé. ¿Tal vez cilantro?")
    g_dontknow(c) {
      const st = kitchen.steps.find((x) => x.id === c.step);
      if (st?.help && !st.done(c)) { DONT_KNOW.set(c, st.id); return; }
      c.say("g_take_time"); c.hold();
    },
    // "No entiendo" to "¿Me explico?": he gives the example (anywhere else: the usual repeat, slower)
    g_dont_understand(c) {
      if (c.step === "example" && !c.s.exampleDone) { exampleNo(c, true); return; }
      GLOBAL_HANDLERS.g_dont_understand(c as any, {});
    },
    // walking away before the end
    g_bye(c) {
      if (c.s.__finished) { closeReply(c); return; }
      // everything the course needs is done (e.g. a goodbye during Fátima's own feedback): the chef closes the afternoon
      if (coreDone(c)) { c.s.__finished = true; closing(c); closeReply(c); return; }
      C(c, "bye_early"); c.end(); c.hold();
    },
  },

  finish: (c) => { closing(c); },

  tests: [
    // the chowder
    { say: "Chef, ¿lo puede probar?", intent: "offer_taste", step: "serve" },
    { say: "¿Le importaría probarlo?", intent: "offer_taste", step: "serve" },
    { say: "Me encantaría saber su opinión.", intent: "offer_taste", step: "serve" },
    { say: "Aquí está mi chowder de pescado.", intent: "offer_taste", step: "serve" },
    { say: "Ya está listo, chef.", intent: "offer_taste", step: "serve" },
    { say: "¿Qué le parece?", intent: "offer_taste", step: "serve" },
    { say: "Chef, ¿puedes probar mi sopa?", intent: "offer_taste", step: "serve" },
    { say: "Pruébalo", intent: "offer_taste", step: "serve" },
    { say: "Estoy un poco nerviosa.", intent: "nervous", step: "serve" },
    { say: "No se ría, por favor.", intent: "nervous", step: "serve" },
    { say: "Todavía no está listo", intent: "nervous", step: "serve", not: ["offer_taste"] },
    // consent
    { say: "Claro, dígame.", intent: "want_feedback", step: "consent" },
    { say: "Por supuesto. Sea honesto, por favor.", intent: "want_feedback", step: "consent" },
    { say: "Sí, me encantaría escuchar sus comentarios.", intent: "want_feedback", step: "consent" },
    { say: "Dígamelo sin rodeos.", intent: "want_feedback", step: "consent" },
    { say: "Ahorita no, chef", intent: "no_feedback", step: "consent", not: ["want_feedback"] },
    { say: "No necesito comentarios", intent: "no_feedback", step: "consent", not: ["want_feedback"] },
    // receiving
    { say: "Gracias, me sirve mucho.", intent: "thanks_helpful", step: "receive" },
    { say: "Lo voy a mejorar.", intent: "will_work", step: "receive" },
    { say: "Tiene sentido.", intent: "thanks_helpful", step: "receive" },
    { say: "Gracias por los comentarios.", intent: "thanks_helpful", step: "receive" },
    { say: "Tiene razón, le falta vida.", intent: "thanks_helpful", step: "receive" },
    { say: "Le agradezco la honestidad.", intent: "thanks_helpful", step: "receive" },
    { say: "Ya entiendo lo que quiere decir.", intent: "thanks_helpful", step: "receive" },
    { say: "Es la receta de mi abuela", intent: "defensive", step: "receive" },
    { say: "En mi país lo hacemos así", intent: "defensive", step: "receive" },
    { say: "No le falta nada", intent: "defensive", step: "receive", not: ["thanks_helpful"] },
    { say: "No tiene sentido", intent: "defensive", step: "receive", not: ["thanks_helpful"] },
    { say: "No lo voy a cambiar", intent: "defensive", step: "receive", not: ["will_work"] },
    // the example and the second taste
    { say: "¿Me puede dar un ejemplo?", intent: "ask_example", step: "example" },
    { say: "¿Qué le pondría usted?", intent: "ask_example", step: "example" },
    { say: "¿Qué quiere decir con acidez?", intent: "ask_example", step: "example" },
    { say: "¿Como qué?", intent: "ask_example", step: "example" },
    { say: "¿Unas gotas de limón?", intent: "guess_lemon", step: "example" },
    { say: "¿Más sal?", intent: "guess_lemon", step: "example" },
    { say: "No tengo dudas", intent: "no_questions", step: "example" },
    { say: "¿Lo puede probar otra vez?", intent: "ask_again", step: "again" },
    { say: "¿Ya está mejor?", intent: "ask_again", step: "again" },
    { say: "Le puse unas gotas de limón.", intent: "ask_again", step: "again" },
    { say: "¿Y ahora?", intent: "again_ctx", step: "again" },
    { say: "No le puse limón", intent: "none", step: "again", not: ["ask_again"] },
    // the tortilla strips
    { say: "No lo había pensado así.", intent: "accept_idea", step: "second" },
    { say: "Buena idea. Lo voy a probar.", intent: "accept_idea", step: "second" },
    { say: "Lo pruebo de las dos maneras.", intent: "accept_idea", step: "second" },
    { say: "Entiendo su punto, pero prefiero dejarlo tradicional.", intent: "keep_own", step: "second" },
    { say: "En mi país lo servimos con galletas saladas aparte.", intent: "keep_own", step: "second" },
    { say: "Gracias, pero prefiero dejarlo sencillo.", intent: "keep_own", step: "second" },
    { say: "No quiero tortilla", intent: "keep_own", step: "second", not: ["accept_idea"] },
    { say: "No es mala idea", intent: "accept_idea", step: "second", not: ["reject_rude"] },
    { say: "¡Qué mala idea!", intent: "reject_rude", step: "second", not: ["accept_idea"] },
    // the favor
    { say: "Claro, con mucho gusto.", intent: "help_yes", step: "handoff" },
    { say: "Por supuesto, chef.", intent: "help_yes_ctx", step: "handoff" },
    { say: "Claro. ¿Dónde está?", intent: "help_yes", step: "handoff" },
    { say: "No sé qué decirle", intent: "help_unsure_ctx", step: "handoff" },
    { say: "¿Por qué yo?", intent: "help_why_ctx", step: "handoff" },
    { say: "No tengo tiempo", intent: "help_no", step: "handoff", not: ["help_yes"] },
    { say: "No me molesta ayudarla", intent: "help_yes", step: "handoff", not: ["help_no"] },
    // Fátima
    { say: "¿Te puedo hacer unos comentarios?", intent: "offer_feedback", step: "mia_open" },
    { say: "A ver, déjame probarlo.", intent: "offer_feedback", step: "mia_open" },
    { say: "El chef me pidió que lo probara.", intent: "offer_feedback", step: "mia_open" },
    { say: "No te preocupes, seguro está rico.", intent: "reassure", step: "mia_open" },
    { say: "¡Huele delicioso!", intent: "reassure", step: "mia_open" },
    { say: "Tranquila. Es solo un ceviche.", intent: "reassure", step: "mia_open" },
    { say: "No está horrible", intent: "reassure", step: "mia_open", not: ["blunt_bad"] },
    { say: "Lo que te quedó muy bien fue el pescado.", intent: "praise_part", step: "mia_worked", slots: { good: "pescado" } },
    { say: "Me gusta mucho el aguacate.", intent: "praise_part", step: "mia_worked", slots: { good: "aguacate" } },
    { say: "El camarón te quedó perfecto.", intent: "praise_part", step: "mia_worked" },
    { say: "El cilantro está buenísimo.", intent: "praise_part", step: "mia_worked" },
    { say: "Está muy rico, Fátima.", intent: "praise_general", step: "mia_worked" },
    { say: "Buen trabajo, Fátima.", intent: "praise_general", step: "mia_worked" },
    { say: "¡Me encanta!", intent: "praise_general", step: "mia_worked" },
    { say: "Está muy picante", intent: "problem_state", step: "mia_worked", not: ["praise_general"] },
    { say: "No me gusta el cilantro", intent: "problem_state", step: "mia_worked", not: ["praise_part"] },
    { say: "No está rico", intent: "blunt_bad", step: "mia_worked", not: ["praise_general"] },
    { say: "No está buenísimo", intent: "blunt_bad", step: "mia_worked", not: ["praise_general"] },
    { say: "Una cosa que podrías probar es un poquito de sal.", intent: "suggest_fix", step: "mia_try", slots: { fix: "sal" } },
    { say: "¿Has pensado en ponerle mango?", intent: "suggest_fix", step: "mia_try" },
    { say: "Yo le pondría un poco más de limón.", intent: "suggest_fix", step: "mia_try" },
    { say: "¿Qué tal un poquito de pepino?", intent: "suggest_fix", step: "mia_try" },
    { say: "Podrías ponerle un poquito de ajo.", intent: "suggest_fix", step: "mia_try" },
    { say: "Le falta una pizca de sal.", intent: "suggest_fix", step: "mia_try", slots: { fix: "sal" } },
    { say: "Está muy picante: quítale las semillas al chile.", intent: "suggest_other", step: "mia_try" },
    { say: "No le pongas sal", intent: "suggest_not", step: "mia_try", not: ["suggest_fix"] },
    { say: "No le falta sal", intent: "suggest_not", step: "mia_try", not: ["suggest_fix"] },
    { say: "Ponle menos chile", intent: "suggest_other", step: "mia_try", not: ["suggest_fix"] },
    { say: "No le cambiaría nada", intent: "no_fix", step: "mia_try", not: ["suggest_fix"] },
    { say: "Nada más un poquito.", intent: "howmuch_ans", step: "mia_howmuch" },
    { say: "Una pizca, nada más.", intent: "howmuch_ans", step: "mia_howmuch" },
    { say: "Empieza con poquito y vuelve a probar.", intent: "howmuch_ans", step: "mia_howmuch" },
    { say: "Poco a poco.", intent: "howmuch_ans", step: "mia_howmuch" },
    { say: "Ya lo vas a lograr.", intent: "encourage", step: "mia_encourage" },
    { say: "No te preocupes, es tu primera semana.", intent: "encourage", step: "mia_encourage" },
    { say: "Yo también era lenta al principio.", intent: "encourage", step: "mia_encourage" },
    { say: "Lo estás haciendo muy bien.", intent: "encourage", step: "mia_encourage" },
    { say: "La rapidez llega con el tiempo.", intent: "encourage", step: "mia_encourage" },
    { say: "No eres lenta", intent: "encourage", step: "mia_encourage", not: ["rush"] },
    { say: "¡Apúrate!", intent: "rush", step: "mia_encourage", not: ["encourage"] },
    { say: "Gracias, Fátima. Me sirve mucho.", intent: "thanks_helpful", step: "mia_back" },
    { say: "No lo había pensado.", intent: "accept_idea", step: "mia_back" },
    { say: "Gracias por lo de hoy, chef.", intent: "thanks_today" },
    // Spain forms are right answers too: vale, zumo, gambas, coger, vosotros
    { say: "Vale, adelante", intent: "want_feedback", step: "consent" },
    { say: "Podrías ponerle un poco de zumo de limón", intent: "suggest_fix", step: "mia_try", slots: { fix: "limon" } },
    { say: "Me gustan mucho las gambas", intent: "praise_part", step: "mia_worked", slots: { good: "camaron" } },
    { say: "¿Queréis probar mi chowder?", intent: "offer_taste", step: "serve" },
    // review: meaning safety and the blind set's traps
    { say: "Nada me gustó", intent: "blunt_bad", step: "mia_worked", not: ["praise_general", "no_fix"] },
    { say: "El aguacate no", intent: "problem_state", step: "mia_worked", not: ["good_ctx", "praise_part"] },
    { say: "El pescado no está muy fresco", intent: "problem_state", step: "mia_worked", not: ["praise_part"] },
    { say: "No más sal", intent: "suggest_not", step: "mia_try", not: ["suggest_fix"] },
    { say: "No le pongas más sal", intent: "suggest_not", step: "mia_try", not: ["suggest_fix"] },
    { say: "Más sal no, más limón", intent: "suggest_fix", step: "mia_try", slots: { fix: "limon" } },
    { say: "No le pongas cilantro, ponle mango", intent: "suggest_fix", step: "mia_try", slots: { fix: "mango" } },
    { say: "Yo no le cambiaría nada", intent: "no_fix", step: "mia_try", not: ["suggest_fix"] },
    { say: "Le pondría menos sal", intent: "suggest_other", step: "mia_try", not: ["suggest_fix"] },
    { say: "No vas bien", intent: "rush", step: "mia_encourage", not: ["encourage"] },
    { say: "No te preocupes, vas muy bien", intent: "encourage", step: "mia_encourage" },
    { say: "Con la práctica vas a mejorar", intent: "encourage", step: "mia_encourage" },
    { say: "No necesito tus consejos", intent: "defensive", step: "mia_back", not: ["thanks_helpful", "accept_idea"] },
    { say: "Mejor así, gracias", intent: "keep_own", step: "second", not: ["accept_idea", "reject_rude"] },
    { say: "Gracias, pero prefiero dejarla así", intent: "keep_own", step: "second", not: ["accept_idea"] },
    { say: "No voy a cambiar nada", intent: "defensive", step: "receive", not: ["will_work", "thanks_helpful"] },
    { say: "No creo que le falte vida", intent: "defensive", step: "receive", not: ["thanks_helpful"] },
    { say: "No, no quiero hacerlo", intent: "help_no", step: "handoff", not: ["help_yes", "help_yes_ctx"] },
    { say: "No, ahora no, gracias", intent: "no_feedback", step: "consent", not: ["want_feedback"] },
    { say: "Sí, quiero saber qué opina", intent: "want_feedback", step: "consent" },
    // audit (5 Nov): side questions, the missing answers and their traps
    { say: "¿Le gustó?", intent: "ask_liked", step: "consent" },
    { say: "¿Qué le pareció?", intent: "ask_liked", step: "receive" },
    { say: "¿Entonces no le gustó?", intent: "ask_liked", step: "receive" },
    { say: "No me gustó", intent: "defensive", step: "receive", not: ["ask_liked"] },
    { say: "No me gustó", intent: "blunt_bad", step: "mia_worked", not: ["ask_liked", "defensive"] },
    { say: "No me gustó", intent: "defensive", step: "mia_back", not: ["ask_liked", "thanks_helpful"] },
    { say: "¿Lo puedo poner en el pizarrón?", intent: "ask_board", step: "second" },
    { say: "¿Va en los especiales?", intent: "ask_board", step: "receive" },
    { say: "No lo voy a poner en el pizarrón", intent: "none", step: "second", not: ["ask_board"] },
    { say: "¿Cuánto le pongo?", intent: "ask_example", step: "again", not: ["ask_again"] },
    { say: "¿Limón o vino blanco?", intent: "ask_example", step: "again", not: ["guess_lemon"] },
    { say: "¿Quién es Fátima?", intent: "help_who_ctx", step: "handoff", not: ["help_yes"] },
    { say: "¿Qué lleva tu ceviche?", intent: "ask_recipe", step: "mia_worked" },
    { say: "¿Qué le pusiste?", intent: "ask_recipe", step: "mia_open" },
    { say: "Todo.", intent: "good_ctx", step: "mia_worked" },
    { say: "Todo mal", intent: "blunt_bad", step: "mia_worked", not: ["good_ctx", "praise_general"] },
    { say: "No hay mala noticia", intent: "no_fix", step: "mia_try", not: ["suggest_fix"] },
    { say: "No vas a quedar mal con el chef", intent: "encourage", step: "mia_encourage", not: ["rush"] },
    { say: "Al chef le va a gustar", intent: "encourage", step: "mia_encourage" },
    { say: "El chef no va a estar contento", intent: "none", step: "mia_encourage", not: ["encourage"] },
    { say: "No se preocupe, es su primera semana", intent: "encourage", step: "mia_encourage" },
    { say: "¿En serio?", intent: "twist_surprise_ctx", step: "mia_back" },
    { say: "¿Habanero en un chowder?", intent: "twist_surprise_ctx", step: "mia_back", not: ["accept_idea"] },
    { say: "Sí, pero rápido", intent: "want_feedback", step: "consent", not: ["no_feedback"] },
    // not understood
    { say: "El elefante morado come teclados", intent: "none" },
    { say: "Mi tía vive en Guadalajara", intent: "none" },
    { say: "teclado banana martes", intent: "none" },
  ],

  sims: [
    // the song's way, start to finish (no "¿cuánto?" question, no twist)
    { name: "happy path: the song's phrases", turns: ["¡Hola, chef! Aquí está mi chowder de pescado.", "Por supuesto. Sea honesto, por favor.", "Gracias, me sirve mucho. Lo voy a mejorar.",
      "¿Me puede dar un ejemplo?", "¿Lo puede probar otra vez?", "No lo había pensado así. Lo pruebo de las dos maneras.", "Claro, con mucho gusto.",
      "¿Te puedo hacer unos comentarios?", "Lo que te quedó muy bien fue el pescado.", "Una cosa que podrías probar es un poquito de cilantro.",
      "No te preocupes, es tu primera semana. Ya lo vas a lograr.", "¡Sí, chef!"], expect: { complete: true, state: { offered: true, exAsked: true, secondAns: true } }, auto: AUTO, setup: PLAIN },
    // asking for the feedback right away (no consent question), questions, keeping the chowder traditional, saying no to
    // the favor first, then a change of mind; Fátima asks "¿cuánto?" (pinned on)
    { name: "questions and changes of mind", turns: ["Chef, ¿lo puede probar? Me encantaría saber su opinión.", "¿Qué quiere decir con acidez?", "Gracias, tiene sentido.",
      "Le puse unas gotas de limón. ¿Ya está mejor?", "Entiendo su punto, pero prefiero dejarlo tradicional.", "Estoy muy ocupado ahorita.", "Bueno, bueno. ¿Dónde está?",
      "No te preocupes, seguro está rico.", "A ver, déjame probarlo.", "Me gusta mucho el aguacate.", "Ponle un poquito de ajo.", "Empieza con poquito y vuelve a probar.",
      "Lo estás haciendo muy bien.", "Gracias por lo de hoy, chef."],
      expect: { complete: true, state: { fbAsked: true, secondHow: "keep", howMuchDone: true } }, auto: AUTO, setup: (s) => { s.howMuch = true; s.backTwist = false; } },
    // the twist on every seed: Fátima gives the learner feedback, and the learner takes it well
    { name: "twist: Fátima's feedback", turns: ["Aquí tiene, chef.", "Claro, dígame.", "Lo voy a mejorar.", "¿Como qué?", "¿Lo puede probar otra vez?", "Buena idea. Lo voy a probar.",
      "Por supuesto, chef.", "¿Te puedo hacer unos comentarios?", "El camarón te quedó perfecto.", "¿Has pensado en ponerle mango?", "Yo también era lento al principio.",
      "Gracias, Fátima. Me sirve mucho.", "¡Entendido, chef!"], expect: { complete: true, state: { backDone: true } }, auto: AUTO,
      setup: (s) => { s.howMuch = false; s.backTwist = true; } },
    // too blunt with Fátima and with the chef: tips, Fátima flinches, then the learner finds the right words
    { name: "blunt first, then better", turns: ["Pruébalo.", "Sí.", "Gracias por los comentarios.", "No tengo dudas.", "Ok.", "No.",
      "Sí, chef.", "Hola, Fátima. Soy Ryan.", "A ver, déjame probarlo.", "Está muy salado.", "El color está buenísimo.", "Tienes que ponerle menos sal.",
      "¡Apúrate!", "No te preocupes. Ya lo vas a lograr.", "Gracias, ¡adiós!"], expect: { complete: true, state: { secondHow: "rude", problemOpen: true } }, auto: AUTO, setup: PLAIN },
    // defensive twice: the chef moves on, item 2 isn't ticked, the closing is the partial one (not done)
    { name: "defensive: not done", turns: ["Ya está listo, chef.", "Claro.", "Pero siempre lo hago así.", "Es la receta de mi abuela.", "¿Me puede dar un ejemplo?",
      "¿Ya está mejor?", "¡Qué mala idea!", "Claro, con mucho gusto.", "¿Te puedo hacer unos comentarios?", "Está muy rico, Fátima.", "Tal vez un poquito de pepino.",
      "Ya lo vas a lograr.", "¡Sí, chef!"], expect: { complete: false, state: { defCount: 2, received: undefined } }, auto: AUTO, setup: PLAIN },
    // nervous, then "No sé": the chef takes the bowl himself (item 1 not ticked); the rest done well
    { name: "the chef takes the bowl", turns: ["Hola, chef.", "Estoy un poco nervioso.", "No sé.", "Bueno, dígame.", "Tiene sentido, gracias.",
      "¿Qué le pondría usted?", "¿Ya está mejor?", "Buena idea.", "Sí, chef.", "¿Quieres unos comentarios?", "Me encanta la cebolla.", "Podrías ponerle un poquito de naranja.",
      "Lo estás haciendo muy bien.", "¡Gracias!"], expect: { complete: true, state: { offered: undefined, served: true } }, auto: AUTO, setup: PLAIN },
    // short answers: the learner's yes and no carry most of it (the steps' own yes/no and the chips' bare words)
    { name: "short answers", turns: ["Aquí tiene.", "Sí.", "Gracias.", "Sí.", "¿Como qué?", "Listo.", "Sí.", "Sí.", "Sí.", "El aguacate.", "Le falta sal.",
      "No, para nada.", "¡Sí, chef!"], expect: { complete: true, state: { praised: true, tried: true, encouraged: true } }, auto: AUTO, setup: PLAIN },
    // hesitating: "¿Por qué yo?", then a no taken back in the same breath (not counted); "No sé" before an answer
    { name: "hesitating", turns: ["Aquí está mi sopa.", "Claro.", "Gracias, me sirve mucho.", "¿Como qué?", "¿Ya está mejor?", "No, gracias.", "¿Por qué yo?",
      "Estoy ocupada, pero va, yo la ayudo.", "¿Puedo probarlo?", "Mmm, no sé... me gusta el aguacate.", "No sé. ¿Qué tal un poquito de cilantro?", "Ya lo vas a lograr.", "¡Sí, chef!"],
      expect: { complete: true, state: { helpNo: undefined, praised: true, tried: true } }, auto: AUTO, setup: PLAIN },
    // walking away in the middle: not done
    { name: "walking away", turns: ["Aquí está mi sopa.", "Perdón, me tengo que ir."], expect: { complete: false }, auto: AUTO, setup: PLAIN },
    // "Ahorita no" first (table nine), then yes; Fátima asks "¿cuánto?" and gets "No sé"; her own feedback is taken badly
    // (twist and question pinned on)
    { name: "not now, then yes; Fátima's feedback taken badly", turns: ["Aquí está mi chowder de pescado.", "Ahorita no, chef.", "Bueno. Dígame.",
      "Tiene razón, le falta vida. Lo voy a mejorar.", "No, no tengo dudas.", "No.", "¿Lo puede probar otra vez?", "Por qué no, probemos.", "Por supuesto, chef.",
      "Hola, Fátima. ¿Puedo probarlo?", "Mmm, el camarón está perfecto.", "Podrías ponerle un poquito de aceite de oliva.", "No sé.",
      "Sigue así, estás aprendiendo muy rápido.", "No necesito tus comentarios.", "Sí, chef."],
      expect: { complete: true, state: { consentNo: 1, backHow: "defensive", howMuchDone: true } }, auto: AUTO, setup: (s) => { s.howMuch = true; s.backTwist = true; } },
    // everything the course needs is done when the learner says goodbye during Fátima's own feedback: the chef closes the afternoon
    { name: "goodbye during the twist", turns: ["Aquí tiene.", "Claro, dígame.", "Gracias, me sirve mucho.", "¿Como qué?", "¡Pruébelo otra vez, chef!", "Buena idea.",
      "Claro, con mucho gusto.", "¿Te puedo hacer unos comentarios?", "Me encanta el sabor.", "¿Qué tal un poquito de ajo?", "Ya lo vas a lograr.", "Perdón, me tengo que ir. ¡Adiós!"],
      expect: { complete: true, state: { backDone: undefined } }, auto: AUTO, setup: (s) => { s.howMuch = false; s.backTwist = true; } },
    // other foods and odd ideas: "Me gustan las tostadas." (bought), then the real praise; "jengibre" surprises her
    { name: "tostadas and ginger", turns: ["¡Hola, chef! Aquí está mi chowder de pescado.", "Por supuesto. Sea honesto, por favor.", "Gracias, me sirve mucho. Lo voy a mejorar.",
      "¿Me puede dar un ejemplo?", "¿Lo puede probar otra vez?", "No lo había pensado así.", "Claro, con mucho gusto.",
      "¿Te puedo hacer unos comentarios?", "Me gustan las tostadas.", "Sí.", "Lo que te quedó muy bien fue el pescado.", "Ponle un poco de jengibre.", "No, para nada.", "¡Sí, chef!"],
      expect: { complete: true, state: { good: "pescado", fix: "jengibre" } }, auto: AUTO, setup: PLAIN },
    // a suggestion before any praise: the praise after it is praise (not yet the encouragement); "Sí, eres lenta" is no kindness;
    // "Tiene razón, pero es la receta de mi abuela": the "pero" part answers
    { name: "suggestion first, then praise", turns: ["Aquí está mi sopa.", "Claro.", "Tiene razón, pero es la receta de mi abuela.", "Gracias, me sirve mucho.", "¿Como qué?", "Listo.",
      "Buena idea.", "Claro.", "¿Puedo probarlo?", "Le falta una pizca de sal.", "El pescado está buenísimo.", "Sí, eres lenta.", "Lo estás haciendo muy bien.", "¡Sí, chef!"],
      expect: { complete: true, state: { defCount: 1, received: true, fix: "sal", good: "pescado", amountGiven: true } }, auto: AUTO, setup: (s) => { s.howMuch = true; s.backTwist = false; } },
    // "Prefiero que no." to the feedback is a no (not "keeping my own way"); "¿Más sal?" is no example of acid; "No está mal."
    { name: "rather not; more salt?; not bad", turns: ["¡Hola, chef! Aquí está mi chowder de pescado.", "Prefiero que no.", "Bueno, dígame.", "Gracias, me sirve mucho.",
      "¿Más sal?", "¡Pruébelo otra vez, chef!", "Buena idea.", "Claro, con mucho gusto.", "¿Te puedo hacer unos comentarios?", "No está mal.",
      "Ponle un poquito de limón.", "¡No eres lenta para nada!", "¡Sí, chef!"],
      expect: { complete: true, state: { praised: true, fix: "limon", exAsked: true } }, auto: AUTO, setup: PLAIN },
    // review: corrections ("No con tortilla, con galletas", "Más sal no, más limón": the second item answers), "Nada me
    // gustó" is no praise, "pero no la cebolla" is no praise of the onion, "No entiendo" gets the example, and "Así está
    // bien" to Fátima's idea keeps the learner's way politely (twist pinned on)
    { name: "corrections and polite keeps", turns: ["Aquí está, pruébelo por favor.", "Sí, quiero saber qué opina.", "No creo que le falte vida.",
      "Gracias, me sirve mucho.", "No entiendo.", "¿Ya está mejor?", "No con tortilla, con galletas.", "Claro.", "¿Puedo probarlo?", "Nada me gustó.",
      "Me encanta el aguacate, pero no la cebolla.", "Más sal no, más limón.", "No te preocupes, vas muy bien.", "Así está bien.", "¡Sí, chef!"],
      expect: { complete: true, state: { defCount: 1, received: true, exAsked: undefined, secondHow: "keep", good: "aguacate", fix: "limon", backHow: "keep" } },
      auto: AUTO, setup: (s) => { s.howMuch = false; s.backTwist = true; } },
    // audit (5 Nov): the shared replies in each cook's own voice (the voice line list records a line in the voices it
    // hears it in). The chef: hello and "¿Cómo estás?", slower, learning, "¿Qué significa…?", a moment, sorry, "de nada"
    // ("Perdón, no te entendí" can't be scripted: random runs reach it in both voices); and "Me gusta." takes his idea
    { name: "the chef's own replies", turns: ["¡Hola, chef! ¿Cómo estás?", "Muy bien, gracias.", "Perdón, ¿puede hablar más despacio?",
      "Aquí está mi chowder de pescado.", "Estoy aprendiendo español.", "Claro, dígame.", "Un momento, por favor.", "Lo siento.",
      "Gracias, me sirve mucho.", "¿Me puede dar un ejemplo?", "¿Qué significa ajústalo?", "Gracias.", "Me gusta.",
      "Claro, con mucho gusto.", "¿Te puedo hacer unos comentarios?", "Me gusta mucho el pescado.", "Podrías ponerle un poquito de sal.", "Ya lo vas a lograr.", "¡Sí, chef!"],
      expect: { complete: true, state: { received: true, secondHow: "accept", good: "pescado", fix: "sal" } }, auto: AUTO, setup: PLAIN },
    // … and the same replies in Fátima's voice, while she waits; "Gracias." to her recipe gets her "de nada"
    { name: "Fátima's own replies", turns: ["Aquí está mi chowder de pescado.", "Claro, dígame.", "Gracias, me sirve mucho.", "¿Me puede dar un ejemplo?",
      "¿Lo puede probar otra vez?", "Buena idea.", "Claro, con mucho gusto.", "¡Hola, Fátima! ¿Cómo estás?", "Bien, gracias.", "¿Qué lleva tu ceviche?", "Gracias.",
      "Perdón, ¿puedes hablar más despacio?", "Estoy aprendiendo español.", "Un momento.", "¿Qué significa porfa?", "Lo siento.", "Sí, el pescado.", "Podrías ponerle un poquito de sal.", "Ya lo vas a lograr.", "¡Sí, chef!"],
      expect: { complete: true, state: { waitAsked: true, recipeSaid: true, good: "pescado", fix: "sal" } }, auto: AUTO, setup: PLAIN },
    // side questions: "¿Le gustó?", the board before and after the second taste, "¿Cuánto le pongo?", "¿Quién es Fátima?",
    // "¿Qué lleva?", a "No." to "¿Lo... quieres probar?", "Todo.", "No le falta sal" (no "¿Sin sal?"), "No hay mala noticia",
    // her worry about the chef, "¿Habanero en un chowder?" (twist pinned on)
    { name: "side questions", turns: ["Aquí está mi chowder de pescado.", "¿Le gustó?", "¿Entonces no le gustó?", "¿Lo puedo poner en el pizarrón?",
      "Gracias, me sirve mucho.", "¿Me puede dar un ejemplo?", "¿Cuánto le pongo?", "Listo.", "¿Entonces va en el pizarrón?", "Con tortilla, entonces.",
      "¿Quién es Fátima?", "Claro.", "¿Qué lleva tu ceviche?", "No.", "Todo.", "No hay mala noticia.", "No le falta sal.", "Le falta una pizca de sal.",
      "No vas a quedar mal con el chef.", "¿Habanero en un chowder?", "Bueno, lo voy a probar.", "¡Sí, chef!"],
      expect: { complete: true, state: { likedSaid: true, boardSaid: true, boardYes: true, hintSaid: true, whoSaid: true, recipeSaid: true, surpriseSaid: true,
        noX: "sal", fix: "sal", backHow: "thanks" } }, auto: AUTO, setup: (s) => { s.howMuch = false; s.backTwist = true; } },
    // no line twice in a row: "¿Y? ¿Qué opinas?" then "No tienes que estar de acuerdo…"; "¿Por qué yo?" answered once; "No sé"
    // twice to Fátima (asked once, then the plate held out); "nothing to change" twice (she gives up); rushed twice (her
    // reaction once, then "Me voy a esforzar más"): not done
    { name: "no line twice in a row", turns: ["Aquí está mi chowder de pescado.", "Claro, dígame.", "Pero siempre lo hago así.", "Lo siento.",
      "Gracias, me sirve mucho.", "¿Como qué?", "¿Ya está mejor?", "Sí, me gusta.", "¿Por qué yo?", "¿Por qué yo?", "No sé.", "No sé.",
      "Me gusta mucho el aguacate.", "No hay mala noticia.", "No, de verdad, nada.", "¡Apúrate!", "Tienes que ser más rápida.", "¡Sí, chef!"],
      expect: { complete: false, state: { defCount: 1, received: true, secondHow: "accept", whySaid: true, trySkip: true, encSkip: true, rushSaid: true } },
      auto: AUTO, setup: PLAIN },
  ],
};

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

const TIPS = kitchen.tips as Record<string, Tip>;

/** The next step's question right away (a step that settled itself while asking). */
function askNext(c: Ctx) {
  const st = kitchen.steps.find((x) => (!x.when || x.when(c)) && !x.done(c));
  if (st) { c.ask(st.id); return; }
  if (!c.s.__finished) { c.s.__finished = true; closing(c); }
}

/** The chef's "¿Y? ¿Qué opinas?" / "No tienes que estar de acuerdo…" (remembered: never the same one twice in a row). */
function recvAsk(c: Ctx, id: string) {
  const say = c.s.recvLast === id ? (id === "receive_again" ? "receive_help" : "receive_again") : id;
  c.s.recvLast = say;
  C(c, say);
}

/** "¿Lo pongo en el pizarrón?" / "¿Le gustó?" after the second taste: yes, tonight (said once). */
function boardYes(c: Ctx) {
  if (c.s.boardYes) return;
  c.s.boardYes = true;
  C(c, "board_yes");
}

/** "Buen punto, pero…": an acknowledgement before a contrast is no answer of its own. */
const contrast = (c: Ctx) => /\bpero\b/.test(heard(c));

/** A bare "sí" (or "Ok", "Entendido") for the step being asked. */
function stepYes(c: Ctx) {
  const st = kitchen.steps.find((x) => x.id === c.step);
  if (st?.yes && !st.done(c)) st.yes(c);
}

/** The chef takes the chowder and tastes it. `offered`: the learner asked (item 1). */
function serveDish(c: Ctx, offered: boolean, tags: string[]) {
  if (c.s.served) return;
  c.s.served = true;
  if (offered) c.s.offered = true;
  if (tags.includes("fb")) c.s.fbAsked = true;
  C(c, "dish_react");
  c.event("taste", { by: "whitaker", dish: "fish_chowder" });
}

/** "Ahorita no": the first time the chef insists (table nine), the second time he keeps it short. */
function refuse(c: Ctx) {
  if (!once(c, "refuse")) return;
  c.s.consentNo = (c.s.consentNo ?? 0) + 1;
  if (c.s.consentNo === 1) { C(c, "consent_no"); C(c, "consent_again"); c.hold(); return; }
  C(c, "consent_no2"); c.s.consented = true;
}

/** The learner takes the feedback well (item 2). */
function receiveWell(c: Ctx, kind: "thanks" | "work" | "ok") {
  // "Tiene razón, pero es la receta de mi abuela": what comes after "pero" answers
  if (kind !== "work" && contrast(c)) return;
  if (!once(c, "receive")) return;
  if (receiveDone(c)) return;
  c.s.received = true;
  C(c, kind === "work" ? "receive_react_work" : kind === "ok" ? "receive_ok" : "receive_react_thanks");
}

/** Defending the dish: the chef answers once (and the learner can try again); a second time he moves on. */
function defend(c: Ctx, tags: string[]) {
  if (!once(c, "defend")) return;
  if (receiveDone(c)) return;
  c.tip(TIPS.defensive);
  c.s.defCount = (c.s.defCount ?? 0) + 1;
  if (c.s.defCount === 1) {
    if (tags.includes("family")) c.s.familySaid = true;
    // (then "¿Y? ¿Qué opinas?" again; a "pero lo voy a mejorar" in the same breath still counts)
    C(c, tags.includes("home") ? "defensive_home" : tags.includes("family") ? "defensive_family" : "defensive_react");
    return;
  }
  C(c, tags.includes("family") && !c.s.familySaid ? "defensive_family" : "def_move_on");
}

/** "¿Me explico?" – "Sí." / "No tengo dudas.": asked once more, then the chef gives the example himself (item 3 not ticked). */
function exampleNo(c: Ctx, now = false) {
  if (!once(c, "example") || c.s.exampleDone) return;
  c.s.exTries = (c.s.exTries ?? 0) + 1;
  if (c.s.exTries >= 2 || now) { c.s.exampleDone = true; C(c, "example_offer"); }
}

/** The learner guessed the example (lime, vinegar…): item 3. */
function guessed(c: Ctx) {
  if (!once(c, "example") || c.s.exampleDone) return;
  c.s.exampleDone = true; c.s.exAsked = true;
  C(c, "example_confirm");
}

/** The chef tastes again. `auto`: he takes the spoon himself ("A ver, déjame probarlo otra vez"). */
function tasteAgain(c: Ctx, auto: boolean) {
  if (!once(c, "again")) return;
  if (c.s.againDone) return;
  c.s.againDone = true;
  if (auto) C(c, "again_auto");
  c.event("taste", { by: "whitaker", dish: "fish_chowder" });
  C(c, "again_react");
}

/** The answer to the tortilla strips (item 4; a rude one is ticked too, with a tip). */
function secondAnswer(c: Ctx, kind: "accept" | "keep" | "rude") {
  // "Entiendo su punto, pero…": what comes after "pero" is the answer
  if (kind === "accept" && contrast(c)) return;
  if (!once(c, "second")) return;
  if (c.s.secondDone) return;
  c.s.secondDone = true; c.s.secondAns = true; c.s.secondHow = kind;
  if (kind === "rude") c.tip(TIPS.polite_disagree);
  if (kind === "accept") C(c, /\bdos (maneras|formas)\b/.test(heard(c)) || c.chance(0.5) ? "second_accept_gold" : "second_accept_react");
  else C(c, kind === "keep" ? "second_keep_react" : "second_rude_react");
}

/** The chef calls Fátima over. */
function callMia(c: Ctx, how: "yes" | "anyway") {
  if (!once(c, "callMia") || c.s.handoffDone) return;
  c.s.handoffDone = true;
  NO_LATER.delete(c);
  C(c, how === "anyway" ? "handoff_anyway" : "handoff_yes");
  c.event("enter", { npc: "russo" });
}

/** "No" to the favor: the chef asks once more, then calls Fátima anyway. A no with a "pero" ("Estoy ocupada, pero va,
 *  yo la ayudo") waits for the step's question at the end of the turn, so a yes after it wins. */
function helpNo(c: Ctx, now = false) {
  if (!once(c, "helpNo") || c.s.handoffDone) return;
  if (!now && contrast(c)) { NO_LATER.add(c); return; }
  helpNoSay(c);
}
function helpNoSay(c: Ctx) {
  c.s.helpNo = (c.s.helpNo ?? 0) + 1;
  if (c.s.helpNo === 1) { C(c, "handoff_no"); return; }
  callMia(c, "anyway");
}

/** "Ten. Nada más pruébalo.": she holds the plate out and the tasting starts. */
function miaHere(c: Ctx) {
  if (c.s.miaOpen) return;
  M(c, "mia_here");
  c.s.miaOpen = true;
}

/** Fátima asks for the idea; the same question never twice in a row ("¿Y cuál es la mala noticia?" / "Hay algo, ¿verdad?"). */
function tryAsk(c: Ctx, id: string) {
  const swap: Record<string, string> = { mia_something: "mia_bad_news", mia_bad_news: "mia_something" };
  const say = c.s.tryLast === id && swap[id] ? swap[id] : id;
  c.s.tryLast = say;
  M(c, say);
}

/** Fátima's "Perdón por ser tan lenta" / "Es que..." (remembered, so neither comes twice in a row). */
function encAsk(c: Ctx, id: string) { c.s.encLast = id; M(c, id); }

/** Fátima is ready to hear it. */
function miaReady(c: Ctx) {
  if (!once(c, "ready") || c.s.miaOpen) return;
  c.s.miaOpen = true;
  M(c, "mia_ready");
}

/** The learner tastes Fátima's ceviche (once). */
function tasteCeviche(c: Ctx) {
  if (c.s.tasted) return;
  c.s.tasted = true;
  c.event("taste", { by: "player", dish: "ceviche" });
}

/** Calming Fátima down: before the tasting it opens the moment (the second time); later it is encouragement. */
function reassure(c: Ctx, quiet = false) {
  if (c.step === "mia_encourage" || (praiseDone(c) && tryDone(c) && !encDone(c))) { encourage(c); return; }
  if (c.step === "mia_back") { twistThanks(c); return; }
  if (c.step === "mia_worked" && !praiseDone(c)) { praise(c, undefined); return; }
  if (!c.s.handoffDone || c.s.miaOpen) return;
  if (!once(c, "reassure")) return;
  c.s.reassured = (c.s.reassured ?? 0) + 1;
  if (c.s.reassured === 1) { if (!quiet) M(c, "mia_reassured"); return; }
  c.s.miaOpen = true;
  M(c, "mia_ready");
}

/** What worked (item 5). `part`: the good_part praised, if any. */
function praise(c: Ctx, part: string | undefined, lukewarm = false) {
  if (!c.s.handoffDone) return;
  // after what worked and one thing to try, kind words are encouragement (a suggestion before any praise doesn't count)
  if (c.step === "mia_encourage" || (praiseDone(c) && tryDone(c) && !encDone(c))) { encourage(c); return; }
  if (c.step === "mia_back") { twistThanks(c); return; }
  if (!once(c, "praise")) return;
  if (!c.s.miaOpen) { c.s.miaOpen = true; tasteCeviche(c); }
  if (c.s.praised) return;
  c.s.praised = true;
  if (part) { c.s.good = part; M(c, "mia_relief", { X: part }); } else M(c, lukewarm ? "mia_lukewarm" : "mia_relief_general");
}

/** A part of the ceviche named in a plain, positive sentence ("Me gusta mucho el aguacate"). */
function partNamed(c: Ctx): string | undefined {
  const h = heard(c);
  if (/\b(no|pero|aunque|nada)\b/.test(h)) return undefined;
  for (const e of GOOD_PARTS) {
    const names = [e.en.replace(/ \| /g, " "), e.pl, ...(e.forms ?? [])].filter(Boolean).map((x) => fold(x as string));
    if (names.some((n) => new RegExp(`\\b${n}\\b`).test(h))) return e.id;
  }
  return undefined;
}

/** "pero no el cilantro", "el cilantro no": the part is named with a "no" next to it. */
function negatedPart(c: Ctx, id: string | undefined): boolean {
  const e = GOOD_PARTS.find((x) => x.id === id);
  if (!e) return false;
  const h = heard(c);
  const names = [e.en.replace(/ \| /g, " "), e.pl, ...(e.forms ?? [])].filter(Boolean).map((x) => fold(x as string));
  return names.some((n) => new RegExp(`\\bno (el |la |los |las |tu |tus )?${n}\\b|\\b${n} no\\b`).test(h));
}

/** Too blunt: Fátima flinches (and, before any praise, asks if anything is good). */
function blunt(c: Ctx) {
  c.tip(TIPS.blunt_bad);
  if (!once(c, "blunt")) return;
  // she flinches once ("Ya sabía"); a second blunt answer gets the tip and her question again, not the same line
  if (!c.s.flinched) { c.s.flinched = true; M(c, "mia_flinch"); }
  if (!praiseDone(c)) { c.s.miaOpen = true; c.s.miaQ = "ask_good"; return; }
  c.s.flinch = true;
}

/** One thing to try (item 6). `fix`: the ingredient, if any. */
function suggestion(c: Ctx, fix: string | undefined, tags: string[]) {
  if (!c.s.handoffDone) return;
  if (c.step === "mia_howmuch" && !c.s.howMuchDone) { if (!once(c, "howmuch")) return; c.s.howMuchDone = true; M(c, "mia_howmuch_ok"); return; }
  if (!once(c, "suggest")) return;
  if (tryDone(c)) return;
  c.s.tried = true;
  c.s.fix = fix;
  if (tags.includes("amt")) c.s.amountGiven = true;
  if (!c.s.miaOpen) { c.s.miaOpen = true; tasteCeviche(c); }
  const e = ingredient(fix);
  if (tags.includes("must")) M(c, "mia_must_react");
  else if (e?.attrs?.odd) M(c, "mia_try_odd");
  else if (e && !(c.s.howMuch && !c.s.amountGiven) && c.chance(0.5)) M(c, "mia_try_x", { X: e.id });
  else M(c, "mia_try_ok");
  // the suggestion came before any praise: Fátima still wants to know what was good (the step asks it)
  if (!praiseDone(c)) c.s.miaQ = "ask_good";
}

/** "Nada, está perfecto": Fátima doesn't believe it; the second time she gives up asking (item 6 not ticked). */
function noFix(c: Ctx) {
  if (!once(c, "nofix")) return;
  c.s.noFix = (c.s.noFix ?? 0) + 1;
  if (c.s.noFix >= 2) { tryGiveUp(c); return; }
  c.s.noFixNow = true;
}
function tryGiveUp(c: Ctx) { c.s.trySkip = true; M(c, "mia_try_giveup"); }

function howMuchUnsure(c: Ctx) {
  if (!once(c, "howmuch") || c.s.howMuchDone) return;
  c.s.howMuchDone = true;
  M(c, "mia_howmuch_unsure");
}

/** Encouraging Fátima (item 7): she thanks the learner, the chef approves. */
function encourage(c: Ctx) {
  if (!once(c, "encourage")) return;
  if (encDone(c)) return;
  c.s.encouraged = true;
  M(c, "mia_encouraged");
  C(c, "chef_end_good");
}

/** "¡Apúrate!" / "Sí, eres lenta.": not what she needs (a tip). `bare`: a plain "sí" or "es cierto". */
function rush(c: Ctx, bare: boolean) {
  if (bare) c.tip(TIPS.rush);
  if (!bare && contrast(c)) return;
  if (!once(c, "rush") || encDone(c) || c.s.rushSaid) return;
  c.s.rushSaid = true;
  M(c, "mia_rush_react");
}

/** The twist: Fátima's feedback received well, kept politely, or rejected. */
function twistThanks(c: Ctx, force = false) {
  if (!force && contrast(c)) return;
  if (!once(c, "twist") || c.s.backDone) return;
  c.s.backDone = true; c.s.backHow = "thanks";
  M(c, "mia_twist_thanks");
  C(c, "chef_twist_laugh");
}
function twistFair(c: Ctx) {
  if (!once(c, "twist") || c.s.backDone) return;
  c.s.backDone = true; c.s.backHow = "keep";
  M(c, "mia_twist_fair");
}
function twistDefensive(c: Ctx) {
  c.tip(TIPS.defensive);
  if (!once(c, "twist") || c.s.backDone) return;
  c.s.backDone = true; c.s.backHow = "defensive";
  M(c, "mia_twist_defensive");
}

/** The chef closes (success: the course report is done) and waits for the learner's goodbye. */
function closing(c: Ctx) {
  if (coreDone(c)) {
    C(c, "closing_chef");
    c.s.goalMet = true;
    c.complete();
    c.remember({ pierChef: true });
  } else C(c, "closing_partial");
  const close = (cc: Ctx) => { closeReply(cc); };
  const on: Record<string, (cc: Ctx, slots: any, seg: Segment) => boolean | void> = {};
  for (const k of [...Object.keys(kitchen.intents).filter((x) => !x.endsWith("_ctx")), "yes_chef_ctx", "g_thanks", "g_bye", "g_ok", "g_hello", "g_sorry"]) on[k] = close;
  c.expect({ id: "closing", expects: ["yes_chef_ctx", "thanks_today"], hints: ["closing"],
    suggest: [{ lt: "Say goodbye to the chef", hint: "closing" }], on, yes: close, no: close });
}

/** The chef's last word (and Fátima's thanks after a good afternoon); the conversation ends. */
function closeReply(c: Ctx) {
  if (!once(c, "close")) return;
  C(c, "closing_reply");
  if (c.s.goalMet) M(c, "mia_bye");
  c.end();
}

// A step's question after a "No sé" that nothing else answered: its help instead.
for (const st of kitchen.steps) {
  const ask = st.ask;
  st.ask = (c) => {
    if (st.help && DONT_KNOW.get(c) === st.id) { DONT_KNOW.delete(c); st.help(c); return; }
    ask(c);
  };
}

export default kitchen;
