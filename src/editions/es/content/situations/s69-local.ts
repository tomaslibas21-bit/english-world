// Song 69 "What Would You Recommend?" → Puerto Colibrí: "¿Qué me recomienda?"
// Doña Carmen, born and raised here, on her bench in the zócalo (usted; she calls the learner mijo / mija). The
// learner asks a local for tips: where to eat (the cocina económica, the taquería, the marisquería El Muelle, Café La
// Ceiba, La Cocina de Lucía, the marquesitas cart), what to try (cochinita pibil, panuchos, salbutes, pescado a la talla,
// marquesitas with queso de bola), what to see (the cenote by colectivo, the ruins by the sea, the beach, the
// malecón at sunset, a boat trip to the reef, the museum across calle Ceiba, the stalls behind her bench), then
// follows up like a real visitor: is it far, how do I get there, touristy?, best time, price, booking, hours, is the
// beach safe at night. Goal = one food tip + one sightseeing tip; she gives a tip only after the learner asks
// something specific, and volunteers the missing one if the learner doesn't ask.
// Twists (as in the English): she offers to walk with you (visits ≥ 1); on a later visit she asks if you tried
// her food tip. Facts kept vague where unsure (cenote entrance: "depends"; the boat trip: "they'll give you a price
// at the pier"). Mexican-only words have a neutral twin (qué padre, ándele, sitio).
// Revision (2 Nov 2026): the Trattoria is gone; the place (id "trattoria", kept for the code and the world) is La Cocina
// de Lucía, a sit-down Yucatecan restaurant on avenida Juárez, one block from the square, red awning (s62, s73), a bit
// pricier than the cocina económica. There is no Italian restaurant in town: an Italian wish gets a kind "no hay" and
// a local tip. Vegetarians get the papadzules (egg in pumpkin-seed sauce) at Lucía's, vegans and the cheap the cocina
// económica. Sources: Wikipedia "Papadzules", "Poc chuc", "Sopa de lima" (read 2 Nov 2026).
// Audit (5 Nov 2026): every direction follows the 3D town (docs/es/TOWN.md "Getting around"). Her bench is in the
// zócalo's south-west quarter, facing avenida Juárez: the bank and Correos across the avenue in front of her, the
// museum to her right across calle Ceiba, the church and the police at the square's east end, the stalls behind her,
// then avenida del Puerto and the malecón. Café La Ceiba and La Cocina de Lucía are a block west on Juárez, the
// taquería by the mercado on avenida del Puerto, the cocina económica on calle Ceiba behind the bank. La Cocina de
// Lucía takes reservations (s73). She also answers where the bank, the mercado, the church and a few other places are.

import type { Ctx, EntityDef, Handler, HintItem, SentSrc, SituationDef } from "@/content/types";
import type { ConvCtx } from "@/convo/dialogue";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Places Doña Carmen knows, kinds of food, countries

type Kind = "food" | "sight" | "night";
const P = (id: string, es: string, en: string, g: "m" | "f", kind: Kind, forms: string[], extra: { name?: boolean; nat?: string; pl?: boolean } = {}) =>
  ent(id, es, en, g, { forms, art: "", attrs: { kind, nat: extra.nat, pl: extra.pl, name: extra.name } });

const SPOTS: EntityDef[] = [
  P("muelle", "El Muelle", "El Muelle", "m", "food", ["el muelle", "muelle", "restaurante el muelle", "el restaurante el muelle", "la marisqueria", "marisqueria", "el restaurante de mariscos", "el de mariscos"], { name: true, nat: "El Muelle" }),
  P("taqueria", "taquería", "taco place", "f", "food", ["la taqueria", "taqueria", "la taqueria del mercado", "los tacos", "el puesto de tacos", "los puestos de tacos"]),
  P("cocina", "cocina económica", "home-style diner", "f", "food", ["la cocina economica", "cocina economica", "la fonda", "fonda", "las fondas", "la comida corrida"]),
  P("cafe", "Café | La Ceiba", "Café | La Ceiba", "m", "food", ["cafe la ceiba", "el cafe la ceiba", "la ceiba", "la cafeteria", "el cafe de mariana"], { name: true, nat: "Café La Ceiba" }),
  P("trattoria", "La Cocina de Lucía", "La Cocina de Lucía", "f", "food", ["la cocina de lucia", "cocina de lucia", "el restaurante de lucia", "restaurante de lucia", "el restaurante de dona lucia", "lo de lucia", "lo de dona lucia", "lucia", "el restaurante yucateco", "un restaurante yucateco", "restaurante yucateco", "el yucateco"], { name: true, nat: "La Cocina de Lucía" }),
  P("marquesitas", "marquesitas", "marquesitas", "f", "food", ["las marquesitas", "marquesita", "una marquesita", "el carrito de marquesitas"], { pl: true }),
  P("cenote", "cenote", "cenote", "m", "sight", ["el cenote", "un cenote", "los cenotes", "cenotes"]),
  P("playa", "playa", "beach", "f", "sight", ["la playa", "la playa publica", "playa publica", "las playas"]),
  P("ruinas", "ruinas", "ruins", "f", "sight", ["las ruinas", "ruinas mayas", "las ruinas mayas", "la zona arqueologica", "zona arqueologica", "las piramides", "la piramide"], { pl: true }),
  P("museo", "museo", "museum", "m", "sight", ["el museo", "museo de la costa maya", "el museo de la costa maya"]),
  P("malecon", "malecón", "waterfront", "m", "sight", ["el malecon", "malecon"]),
  P("lancha", "paseo | en | lancha", "trip | by | boat", "m", "sight", ["el paseo en lancha", "paseo en lancha", "la lancha", "lancha", "un paseo en barco", "el arrecife", "arrecife", "snorkel", "esnorquel", "el tour en lancha", "tour en lancha"], { nat: "boat trip" }),
  P("puestos", "puestos", "stalls", "m", "sight", ["los puestos", "el tianguis", "tianguis", "el mercadito", "los puestos de la plaza"], { pl: true, nat: "market stalls" }),
  P("musica", "música | en vivo", "music | live", "f", "night", ["la musica", "musica en vivo", "la musica en vivo", "el concierto", "el kiosco", "la musica del kiosco"], { nat: "live music" }),
];

const C = (id: string, es: string, en: string, g: "m" | "f", forms: string[], nat?: string) => ent(id, es, en, g, { forms, art: "", attrs: { nat } });
const CUISINES: EntityDef[] = [
  C("mariscos", "mariscos", "seafood", "m", ["marisco", "pescado", "pescados", "camarones", "camaron", "ceviche", "cocteles", "coctel de camaron", "pulpo", "langosta", "algo del mar", "comida del mar", "tacos de pescado", "pescado frito", "aguachile", "pescado a la talla"]),
  C("yucateca", "comida | yucateca", "food | Yucatán", "f", ["yucateca", "comida tipica", "algo tipico", "lo tipico", "comida de aqui", "algo de aqui", "comida local", "algo local", "comida regional", "comida mexicana", "algo mexicano", "cochinita", "cochinita pibil", "panuchos", "panucho", "salbutes", "salbut", "sopa de lima", "poc chuc", "papadzules", "relleno negro", "comida casera", "comida corrida", "algo yucateco", "comida yucateca tipica", "tikin xic", "pescado tikin xic"], "Yucatán food"),
  C("tacos", "tacos", "tacos", "m", ["taco", "unos tacos", "tacos al pastor", "al pastor", "antojitos", "garnachas", "comida callejera", "comida de la calle", "tortas", "quesadillas"]),
  C("italiana", "comida | italiana", "food | Italian", "f", ["italiana", "italiano", "algo italiano", "pasta", "pizza", "lasana", "una pizza", "restaurante italiano", "un restaurante italiano", "algun restaurante italiano", "un italiano", "algun italiano", "un lugar italiano", "espagueti", "spaghetti"], "Italian food"),
  C("vegetariana", "comida | vegetariana", "food | vegetarian", "f", ["vegetariana", "vegetariano", "comida vegana", "vegana", "vegano", "ensalada", "ensaladas", "algo sin carne", "algo vegetariano", "algo vegano", "comida sin carne"], "vegetarian food"),
  C("cafe", "café", "coffee", "m", ["un cafe", "cafecito", "un cafecito", "cafe de olla", "capuchino", "un buen cafe"]),
  C("desayuno", "desayuno", "breakfast", "m", ["un desayuno", "un buen desayuno", "chilaquiles", "huevos", "huevos motulenos", "molletes", "pan dulce"]),
  C("rapido", "algo | rápido", "something | quick", "m", ["algo ligero", "una botana", "un antojito", "una torta", "algo para llevar"], "something quick"),
  C("dulce", "algo | dulce", "something | sweet", "m", ["postre", "un postre", "marquesitas", "una marquesita", "helado", "nieve", "crepas", "una crepa", "churros"], "something sweet"),
];

const COUNTRIES: EntityDef[] = [
  ent("usa", "Estados Unidos", "the United States", "m", { forms: ["los estados unidos", "usa", "eu", "e u", "america", "nueva york", "california", "texas", "chicago", "florida"] }),
  ent("canada", "Canadá", "Canada", "m", { forms: ["canada", "toronto", "vancouver", "montreal", "quebec"] }),
  ent("uk", "Inglaterra", "England", "f", { forms: ["inglaterra", "el reino unido", "reino unido", "londres", "escocia", "gales"] }),
  ent("ireland", "Irlanda", "Ireland", "f", { forms: ["irlanda", "dublin"] }),
  ent("australia", "Australia", "Australia", "f", { forms: ["australia", "sidney", "sydney", "melbourne"] }),
  ent("nz", "Nueva Zelanda", "New Zealand", "f", { forms: ["nueva zelanda", "nueva zelandia"] }),
];

// Places that aren't tips: "¿Dónde hay un cajero?" gets the way from her bench (TOWN.md "From the zócalo's kiosco");
// the farther ones, Información Turística and its map.
const PLACES: EntityDef[] = [
  ent("banco", "banco", "bank", "m", { forms: ["el banco", "banco", "un banco", "banco del puerto", "el banco del puerto", "cajero", "un cajero", "el cajero", "cajero automatico", "un cajero automatico", "algun cajero", "cajeros", "atm", "un atm"] }),
  ent("correos", "correos", "post office", "m", { forms: ["correos", "el correo", "la oficina de correos", "oficina de correos", "la oficina postal"] }),
  ent("iglesia", "iglesia", "church", "f", { forms: ["la iglesia", "iglesia", "la parroquia", "parroquia", "el templo", "la catedral"] }),
  ent("policia", "policía", "police", "f", { forms: ["la policia", "policia", "la policia municipal", "la comandancia", "la estacion de policia", "estacion de policia"] }),
  ent("mercado", "mercado", "market", "m", { forms: ["el mercado", "mercado", "mercado municipal", "el mercado municipal"] }),
  ent("turismo", "Información Turística", "tourist information", "f", { forms: ["informacion turistica", "la informacion turistica", "oficina de turismo", "la oficina de turismo", "turismo", "el modulo de informacion", "modulo de informacion", "el centro de visitantes", "la oficina de informacion"] }),
  ent("farmacia", "farmacia", "pharmacy", "f", { forms: ["la farmacia", "farmacia", "una farmacia", "farmacia del puerto", "la farmacia del puerto"] }),
  ent("hotel", "Hotel Mar Azul", "Hotel Mar Azul", "m", { forms: ["el hotel", "hotel", "hotel mar azul", "el hotel mar azul", "mar azul", "mi hotel"] }),
  ent("terminal", "terminal", "bus station", "f", { forms: ["la terminal", "terminal de autobuses", "la terminal de autobuses", "la central", "la central de autobuses", "la parada del camion", "la parada del autobus", "parada de camion"] }),
  ent("aeropuerto", "aeropuerto", "airport", "m", { forms: ["el aeropuerto", "aeropuerto"] }),
  ent("clinica", "clínica", "clinic", "f", { forms: ["la clinica", "clinica", "el hospital", "hospital", "el centro de salud"] }),
  ent("otro", "gasolinera", "gas station", "f", { forms: ["la gasolinera", "gasolinera", "la renta de autos", "renta de autos", "el gimnasio", "gimnasio", "linea clara", "la oficina de linea clara"] }),
];
/** Where each place is, from her bench; any other place: ask at Información Turística. */
const WHERE: Record<string, string> = { banco: "where_banco", correos: "where_correos", iglesia: "where_iglesia", policia: "where_policia",
  mercado: "where_mercado", turismo: "where_turismo", farmacia: "where_west", hotel: "where_west" };

// Which place Doña Carmen recommends for which food
const FOR_CUISINE: Record<string, string> = {
  mariscos: "muelle", yucateca: "cocina", tacos: "taqueria", italiana: "trattoria", vegetariana: "trattoria",
  cafe: "cafe", desayuno: "cafe", rapido: "taqueria", dulce: "marquesitas",
};
const CHEAP = new Set(["taqueria", "cocina", "cafe", "marquesitas"]);
/** Kinds of food no place in town is "for": not wanting them rules out no place (Lucía's has Yucatecan meat dishes). */
const NOT_THEIRS = new Set(["italiana", "vegetariana"]);
const placeOf = (a: string) => (NOT_THEIRS.has(a) ? undefined : FOR_CUISINE[a]);
const KIND: Record<string, Kind> = Object.fromEntries(SPOTS.map((e) => [e.id, e.attrs!.kind as Kind]));

// Facts per place → line ids
const WALK: Record<string, string> = { cenote: "walk_cenote", ruinas: "walk_ruinas", museo: "walk_museo", muelle: "walk_malecon", malecon: "walk_malecon", playa: "walk_malecon", lancha: "walk_malecon",
  taqueria: "walk_close", cocina: "walk_close", cafe: "walk_close", trattoria: "walk_close", puestos: "walk_here", musica: "walk_here", marquesitas: "walk_here" };
const HOW: Record<string, string> = { cenote: "dir_cenote", ruinas: "dir_ruinas", museo: "walk_museo", muelle: "dir_muelle", malecon: "dir_malecon", playa: "dir_malecon", lancha: "dir_muelle",
  trattoria: "dir_trattoria", cafe: "dir_cafe", cocina: "dir_cocina", taqueria: "dir_mercado", puestos: "walk_here", musica: "walk_here", marquesitas: "walk_here" };
const TOURISTY: Record<string, string> = { cenote: "tour_bit", ruinas: "tour_bit", lancha: "tour_bit", playa: "tour_bit", muelle: "tour_muelle", puestos: "tour_market",
  taqueria: "tour_locals", cocina: "tour_locals", cafe: "tour_locals", musica: "tour_locals", marquesitas: "tour_locals", trattoria: "tour_mixed", museo: "tour_quiet", malecon: "tour_quiet" };
const TIME: Record<string, string> = { cenote: "time_cenote", ruinas: "time_ruinas", malecon: "time_sunset", playa: "time_beach", museo: "time_museo", muelle: "time_muelle", lancha: "time_lancha",
  taqueria: "time_taqueria", cocina: "time_cocina", puestos: "time_market", musica: "time_musica", marquesitas: "time_night", cafe: "time_cafe", trattoria: "time_trattoria" };
const PRICE: Record<string, string> = { muelle: "price_muelle", trattoria: "price_trattoria", taqueria: "price_taqueria", cocina: "price_cocina", cafe: "price_cafe", marquesitas: "price_cheap",
  puestos: "price_cheap", malecon: "price_free", playa: "price_free", musica: "price_free", museo: "price_museo", ruinas: "price_ruinas", cenote: "price_cenote", lancha: "price_lancha" };
const BOOK: Record<string, string> = { muelle: "book_muelle", trattoria: "book_trattoria", lancha: "book_lancha" };
const OPEN: Record<string, string> = { lancha: "time_lancha", museo: "open_museo", puestos: "open_market", musica: "open_musica", cocina: "open_cocina", cenote: "open_cenote", ruinas: "open_ruinas",
  taqueria: "time_taqueria", marquesitas: "time_night", malecon: "open_always", playa: "open_always" };

const A_TELL = "a marks the person you tell; English needs no word for it.";
const MIJA = "mijo / mija: “dear” (from mi hijo / mi hija), warm, from an older person.";
const LOLA = "lo / la: “you” (usted), for a man / a woman.";
const ART_TIME = "The article before a clock time has no English word.";
const COCINA_EC = "cocina económica: a small family place with cheap home cooking.";
const POC_CHUC = "poc chuc: pork in a citrus marinade, grilled, a Yucatán classic.";

/** "Did you try …?" on a later visit, one line per food tip. */
const TRIED: Record<string, SentSrc> = {
  muelle: t("¿Ya | cenó | en | El Muelle?", "Already | you-had-dinner | at | El Muelle?", "Did you have dinner at El Muelle?", { flags: { 0: "Ya in a question: “yet”, “already”." }, spain: t("¿Ya | ha cenado | en | El Muelle?", "Already | you've-had-dinner | at | El Muelle?", "Did you have dinner at El Muelle?", {flags: {0: "Ya in a question: “yet”, “already”."}}) }),
  taqueria: t("¿Ya | fue | a | la | taquería?", "Already | you-went | to | the | taco place?", "Did you go to the taco place?", { flags: { 0: "Ya in a question: “yet”, “already”." }, spain: t("¿Ya | ha ido | a | la | taquería?", "Already | you've-gone | to | the | taco place?", "Did you go to the taco place?", {flags: {0: "Ya in a question: “yet”, “already”."}}) }),
  cocina: t("¿Ya | fue | a | la | cocina económica?", "Already | you-went | to | the | home-style diner?", "Did you go to the little diner?", { flags: { 0: "Ya in a question: “yet”, “already”." }, spain: t("¿Ya | ha ido | a | la | cocina económica?", "Already | you've-gone | to | the | home-style diner?", "Did you go to the little diner?", {flags: {0: "Ya in a question: “yet”, “already”."}}) }),
  cafe: t("¿Ya | probó | el | café | de | La Ceiba?", "Already | you-tried | the | coffee | of | La Ceiba?", "Did you try the coffee at La Ceiba?", { flags: { 0: "Ya in a question: “yet”, “already”." }, spain: t("¿Ya | ha probado | el | café | de | La Ceiba?", "Already | you've-tried | the | coffee | of | La Ceiba?", "Did you try the coffee at La Ceiba?", {flags: {0: "Ya in a question: “yet”, “already”."}}) }),
  trattoria: t("¿Ya | fue | a | La Cocina de Lucía?", "Already | you-went | to | La Cocina de Lucía?", "Did you go to La Cocina de Lucía?", { flags: { 0: "Ya in a question: “yet”, “already”." }, spain: t("¿Ya | ha ido | a | La Cocina de Lucía?", "Already | you've-gone | to | La Cocina de Lucía?", "Did you go to La Cocina de Lucía?", {flags: {0: "Ya in a question: “yet”, “already”."}}) }),
  marquesitas: t("¿Ya | probó | las | marquesitas?", "Already | you-tried | the | marquesitas?", "Did you try the marquesitas?", { flags: { 0: "Ya in a question: “yet”, “already”." }, spain: t("¿Ya | ha probado | las | marquesitas?", "Already | you've-tried | the | marquesitas?", "Did you try the marquesitas?", {flags: {0: "Ya in a question: “yet”, “already”."}}) }),
};

const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const conv = (c: Ctx) => (c as ConvCtx).conv;

// Automatic answers for the simulations (keyed by step or pending id).
const AUTO: Record<string, string> = {
  need: "¿Me puede recomendar un buen lugar para comer?", food_kind: "Mariscos, por favor", which_kind: "Para comer", sight: "Sí, ¿qué vale la pena ver aquí?",
  food: "Sí, ¿dónde puedo comer?", from: "Soy de Canadá", walk: "¡Me encantaría, gracias!", more: "No, es todo. ¡Gracias por los consejos!",
  weather: "Sí, ¡qué día tan bonito!", tried: "Todavía no", which_spot: "El cenote",
};

// ---------------------------------------------------------------------------
// Helpers

/** True the first time `key` happens in this utterance (an utterance may be parsed as several segments). */
function onceThisTurn(c: Ctx, key: string): boolean {
  const turn = conv(c).history.length;
  if (c.s.onceTurn !== turn) { c.s.onceTurn = turn; c.s.onceKeys = []; }
  if (c.s.onceKeys.includes(key)) return false;
  c.s.onceKeys.push(key);
  return true;
}

/** Doña Carmen recommends a place; the conversation now talks about it ("¿Está lejos?"). */
function recommend(c: Ctx, id: string, fromStep = false, line?: string) {
  // one tip per utterance; her own tip for a step she asked is extra
  if (!fromStep && !onceThisTurn(c, "rec")) return;
  c.s.topic = id;
  if (!c.s.recs.includes(id)) c.s.recs.push(id);
  if (KIND[id] === "food") { c.s.foodRec = true; c.s.wantFood = false; c.remember({ lastTip: id }); }
  else c.s.sightRec = true;
  // a vegetarian never hears about the cochinita or the poc chuc
  if (!line && c.s.veg && id === "trattoria") line = "rec_trattoria_veg";
  if (!line && c.s.veg && id === "cocina") line = c.s.vegan ? "rec_cocina_vegan" : "rec_cocina_veg";
  c.say(line ?? `rec_${id}`);
}

/** True when recommend() would still give a tip in this utterance. */
function recFree(c: Ctx, fromStep = false): boolean {
  return fromStep || c.s.onceTurn !== conv(c).history.length || !(c.s.onceKeys as string[]).includes("rec");
}

/** "Soy vegetariana", "algo sin carne", "soy vegano / no como huevo": no tacos, no seafood, the meatless lines. */
function setVeg(c: Ctx) {
  c.s.veg = true;
  // "no soy vegana" and "sí como huevo" are not vegan
  if (/(?<!no (soy|somos) )vegan|(ni|sin) huevos?|no (como|comemos) (carne ni )?huevos?|animal/.test(plain(c.heard))) c.s.vegan = true;
  for (const a of ["tacos", "mariscos"]) if (!c.s.avoid.includes(a)) c.s.avoid.push(a);
}

const plain = (h?: string) => (h || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** What the whole utterance says, whichever of its pieces gives the tip: "Somos vegetarianos y buscamos algo barato,
 *  ¿hay pizza?" is a meatless, cheap tip after "no Italian here". */
function readTurn(c: Ctx) {
  const h = plain(c.heard);
  if (/(?<!no (soy|somos) )(vegetarian|vegan)|no (como|comemos) carne|sin carne/.test(h)) setVeg(c);
  if (/barat|economic|no (sea|es|este|tan|muy) (muy |tan )?car|gastar mucho|poco dinero/.test(h)) c.s.cheap = true;
}
const ITALIAN = /(?<!no (quiero|como|me gusta|me gustan|se me antoja) [a-z ]{0,12})\b(italian[oa]s?|pizzas?|pastas?|espagueti|spaghetti|lasana)\b(?!,? (no|tampoco)\b)/;

function foodFor(c: Ctx, cuisine: string | undefined, cheap: boolean, fancy = false): string {
  const avoid: string[] = c.s.avoid || [];
  let id = cuisine ? FOR_CUISINE[cuisine] : cheap ? "taqueria" : fancy ? "muelle" : c.s.foodDefault;
  if (cuisine === "mariscos" && cheap) id = "taqueria";
  // "¿Hay un restaurante yucateco?": a sit-down restaurant, La Cocina de Lucía (the fonda is the cheap one)
  if (cuisine === "yucateca" && !cheap && /restaurantes? (yucatec|mexican|tipic|típic)/i.test(c.heard || "")) id = "trattoria";
  // the dishes she names at Lucía's are Lucía's: "¿Dónde puedo probar el poc chuc?"
  if (cuisine === "yucateca" && !cheap && /poc chuc|papadzul|sopa de lima|tikin/.test(plain(c.heard))) id = "trattoria";
  if (cheap && !CHEAP.has(id)) id = "cocina";
  // the papadzules have egg: a vegan goes to the cocina económica
  if (c.s.vegan && id === "trattoria") id = "cocina";
  // never the kind of food the learner said they don't want
  const bad = (x: string) => avoid.some((a) => placeOf(a) === x) || (avoid.includes("mariscos") && x === "muelle");
  if (bad(id)) id = ["cocina", "trattoria", "cafe", "taqueria", "muelle"].find((x) => !bad(x)) ?? "cafe";
  return id;
}

/** A food tip, with the fish-taco line when the learner wants cheap seafood. */
function recFood(c: Ctx, cuisine: string | undefined, cheap: boolean, fancy = false, fromStep = false) {
  if (cuisine === "vegetariana") setVeg(c);
  if (recFree(c, fromStep)) readTurn(c);
  cheap = cheap || !!c.s.cheap;
  // no Italian place in town: she says so kindly, then a local tip (also when the pizza came after "soy vegetariana")
  const italian = cuisine === "italiana" || ITALIAN.test(plain(c.heard));
  if (italian && !c.s.noItalian && recFree(c, fromStep)) { c.s.noItalian = true; c.say("no_italian"); }
  const id = foodFor(c, cuisine === "italiana" && c.s.veg ? "vegetariana" : cuisine, cheap, fancy);
  recommend(c, id, fromStep, id === "taqueria" && cuisine === "mariscos" ? "rec_taqueria_fish" : undefined);
}

/** She gave a tip nobody asked for (her own question went unanswered): straight on to her next question. */
function thenNext(c: Ctx) {
  const nx = conv(c).nextStep(c as ConvCtx);
  if (nx && nx.id !== conv(c).step) c.ask(nx.id);
}

const SIGHTS = ["cenote", "ruinas", "playa", "lancha", "malecon", "museo", "puestos"];
const okSight = (c: Ctx, x: string) => !(c.s.avoidSight || []).includes(x);

/** Another sight when the learner wants more ideas. */
function anotherSight(c: Ctx): string {
  return SIGHTS.find((x) => !c.s.recs.includes(x) && okSight(c, x)) ?? "malecon";
}

function sightFor(c: Ctx, tags: string[]): string {
  const by: [string, string][] = [["view", "malecon"], ["art", "museo"], ["ruins", "ruinas"], ["nature", "cenote"], ["cenote", "cenote"], ["kids", "lancha"], ["sea", "lancha"], ["beach", "playa"], ["shop", "puestos"], ["quiet", "malecon"]];
  for (const [tag, id] of by) if (tags.includes(tag) && okSight(c, id)) return id;
  return okSight(c, c.s.sightDefault) ? c.s.sightDefault : anotherSight(c);
}

/** A follow-up question about "it": the place in the slots, or the last one she mentioned. */
function aboutSpot(c: Ctx, slots: any, table: Record<string, string>, fallback: string) {
  const id = (slots.spot as string | undefined) ?? c.s.topic;
  if (!id) {
    c.say("which_spot");
    c.expect({ id: "which_spot", optional: true, expects: ["spot_ctx"], hints: ["spots"], suggest: [{ lt: "Say which place you mean", hint: "spots", options: "spot" }],
      on: { spot_ctx: (cc, sl) => { const sp = sl.spot as string; cc.s.topic = sp; noteSpot(cc, sp); cc.say(table[sp] ?? fallback); } } });
    return;
  }
  if (slots.spot && slots.spot !== c.s.topic) c.s.topic = slots.spot;
  if (slots.spot) noteSpot(c, slots.spot);
  c.say(table[id] ?? fallback);
}

/** The learner asked about a place by name and she answered: that place is now one of her tips. */
function noteSpot(c: Ctx, id: string) {
  if (!c.s.recs.includes(id)) c.s.recs.push(id);
  if (KIND[id] === "food") { if (!c.s.foodRec) { c.s.foodRec = true; c.s.wantFood = false; c.remember({ lastTip: id }); } }
  else if (KIND[id] === "sight") c.s.sightRec = true;
}

/** "¿Para comer, o algo que ver?" – "Para comer." / "Algo que ver." / "¡Las dos cosas!" */
function expectKind(c: Ctx) {
  c.expect({ id: "which_kind", optional: true, expects: ["kind_ctx"], hints: ["kind"],
    suggest: [{ lt: "Say: something to eat or something to see", hint: "kind" }],
    on: { kind_ctx: (cc, sl, sg) => { H.kind_ctx(cc, sl, sg); } } });
}

const H: Record<string, Handler> = {
  are_you_local(c) { c.s.local = true; c.say("local_yes"); },
  recommend_vague(c) {
    if (c.s.foodRec && !c.s.sightRec) { recommend(c, sightFor(c, [])); return; }
    if (c.s.sightRec && !c.s.foodRec) { c.s.wantFood = true; return; }
    if (c.s.foodRec && c.s.sightRec) { recommend(c, anotherSight(c)); return; }
    c.say("which_kind");
    expectKind(c);
  },
  kind_ctx(c, _slots, seg) {
    if (seg.tags.includes("both")) { c.say("both_ok"); recommend(c, sightFor(c, [])); c.s.wantFood = true; return; }
    if (seg.tags.includes("sight")) { recommend(c, sightFor(c, [])); return; }
    c.s.wantFood = true;
  },
  ask_food(c, slots, seg) {
    const cuisine = (slots.cuisine as string | undefined) ?? (seg.tags.includes("typical") ? "yucateca" : undefined);
    const tags = [...seg.tags, ...toArr(slots.budget).flatMap((b: any) => b?.__tags || [])];
    const cheap = tags.includes("cheap");
    if (cheap) c.s.cheap = true;
    if (tags.includes("locals")) { H.ask_locals(c, {}, { intent: "ask_locals", slots: {}, tags: [] }); return; }
    if (cuisine === "cafe" && !cheap) { H.ask_coffee(c, slots, seg); return; }
    if (cuisine || cheap || tags.includes("fancy")) { recFood(c, cuisine, cheap || !!c.s.cheap, tags.includes("fancy")); return; }
    // vague: ask what they feel like (the food_kind step asks); after a food tip, another place
    if (c.s.foodRec) { if (!recFree(c)) return; const alt = ["cocina", "taqueria", "cafe", "trattoria", "muelle"].find((x) => !c.s.recs.includes(x) && !(c.s.avoid as string[]).some((a) => placeOf(a) === x)); if (alt) { c.say("then_try"); recommend(c, alt); return; } }
    c.s.wantFood = true;
  },
  food_ans(c, slots, seg) {
    if (slots.bad && !c.s.avoid.includes(slots.bad)) c.s.avoid.push(slots.bad);
    if (seg.tags.includes("any")) { recFood(c, undefined, !!c.s.cheap); return; }
    const cuisine = (slots.cuisine as string | undefined) ?? (seg.tags.includes("typical") ? "yucateca" : undefined);
    recFood(c, cuisine, !!c.s.cheap);
  },
  food_neg(c, slots) {
    const cu = slots.cuisine as string | undefined;
    if (cu && !c.s.avoid.includes(cu)) c.s.avoid.push(cu);
    c.say("no_problem");
    // she just recommended that kind of place: another one
    const badTopic = c.s.topic && KIND[c.s.topic] === "food" && c.s.avoid.some((a: string) => placeOf(a) === c.s.topic || (a === "mariscos" && c.s.topic === "muelle"));
    if (badTopic || (c.step === "food_kind" && !c.s.foodRec)) {
      c.say("then_try");
      recFood(c, undefined, !!c.s.cheap);
      return;
    }
    if (!c.s.foodRec) c.s.wantFood = true;
  },
  budget(c, _slots, seg) {
    if (seg.tags.includes("cheap")) c.s.cheap = true;
    // "Somos veganos, ¿algo no muy caro?": the tip of this turn already took it in (readTurn)
    if (!recFree(c)) return;
    if ((c.s.wantFood || c.step === "food_kind" || c.step === "food") && !c.s.foodRec) recFood(c, undefined, !!c.s.cheap, seg.tags.includes("fancy"));
    else if (c.s.topic && KIND[c.s.topic] === "food" && c.s.cheap && !CHEAP.has(c.s.topic)) H.too_expensive(c, {}, seg);
    else if (!c.s.foodRec && c.s.cheap) recFood(c, undefined, true);
    else c.say("no_problem");
  },
  too_expensive(c, slots, seg) {
    // "¿Es muy caro?" asks the price; "Es muy caro" and "¿Hay algo más barato?" ask for something cheaper
    const h = c.heard || "";
    if (/\?/.test(h) && !/(barat|econ[oó]mic|alcanza|dinero|para m[ií])/i.test(h)) { H.ask_price(c, slots, seg); return; }
    c.s.cheap = true;
    const cur = c.s.topic;
    if (cur && KIND[cur] !== "food") { c.say("cheaper_sight"); recommend(c, cur === "playa" ? "malecon" : "playa", false, cur === "playa" ? "rec_malecon" : "cheaper_beach"); return; }
    // no tacos for a vegetarian (or someone who said no to them): the cocina económica
    const cheaper = cur === "taqueria" || (c.s.avoid as string[]).includes("tacos") ? "cocina" : "taqueria";
    if (cheaper === cur) { c.say("price_cocina"); return; }
    if (!recFree(c)) return;
    c.say("cheaper");
    // El Muelle (seafood) too pricey: the fish tacos at the taquería
    recommend(c, cheaper, false, cheaper === "taqueria" && cur === "muelle" ? "rec_taqueria_fish" : undefined);
  },
  not_hungry(c, slots) {
    // "Ya comí tacos": not tacos again
    const cu = slots.cuisine as string | undefined;
    if (cu && !c.s.avoid.includes(cu)) c.s.avoid.push(cu);
    c.say("later_food");
    recFood(c, undefined, !!c.s.cheap);
  },
  ask_sight(c, _slots, seg) {
    if (seg.tags.includes("else") || (c.s.sightRec && !["art", "nature", "kids", "shop", "view", "beach", "sea", "ruins", "cenote"].some((x) => seg.tags.includes(x)))) { recommend(c, anotherSight(c)); return; }
    const id = sightFor(c, seg.tags);
    recommend(c, id);
    if (id === "museo" || c.s.recs.includes("museo") || !okSight(c, "museo")) return;
    if (c.chance(0.4)) { c.say("also_museo"); c.s.recs.push("museo"); }
  },
  ask_about_spot(c, slots, seg) {
    if (slots.bad) { c.s.avoidSight = [...(c.s.avoidSight || []), slots.bad]; c.s.recs = c.s.recs.filter((x: string) => x !== slots.bad); }
    const id = slots.spot as string;
    if (!id) return;
    // one of her tips already: no second tip, an answer to what was asked ("¿Dónde queda?", "¿Qué tal es?", "¿Qué es?")
    if (c.s.recs.includes(id)) {
      c.s.topic = id;
      if (seg.tags.includes("where")) { c.say(HOW[id] ?? "walk_close"); return; }
      if (seg.tags.includes("what")) { GLOBAL_HANDLERS.g_meaning(c as ConvCtx, slots); return; }
      c.say(seg.tags.includes("like") ? "like_it" : "worth");
      return;
    }
    recommend(c, id);
  },
  buy_produce(c, _slots, seg) {
    c.say(seg.tags.includes("where") ? "market_where" : "market_seller");
    if (!c.s.marketTip && !seg.tags.includes("craft")) { c.s.marketTip = true; c.say("market_tip"); }
    c.s.topic = "puestos"; // "¿A qué hora cierran?" is about the stalls now
  },
  ask_favorite(c) { c.say("favorite"); c.s.topic = "malecon"; if (!c.s.sightRec) { c.s.sightRec = true; c.s.recs.push("malecon"); } },
  ask_locals(c, _slots, seg) {
    if (seg.tags.includes("do")) { c.say("locals_do"); c.s.topic = "puestos"; if (!c.s.sightRec) { c.s.sightRec = true; c.s.recs.push("puestos"); } return; }
    c.say("locals_eat");
    c.s.topic = "taqueria";
    if (!c.s.recs.includes("taqueria")) c.s.recs.push("taqueria");
    c.s.foodRec = true; c.s.wantFood = false; c.remember({ lastTip: "taqueria" });
  },
  ask_night(c) {
    c.say("night");
    c.say("night_marq");
    c.s.topic = "musica";
  },
  ask_coffee(c) {
    c.s.topic = "cafe";
    c.say("coffee");
    if (!c.s.recs.includes("cafe")) c.s.recs.push("cafe");
    c.s.foodRec = true; c.s.wantFood = false; c.remember({ lastTip: "cafe" });
  },
  // follow-ups
  ask_walk(c, slots, seg) { aboutSpot(c, slots, seg.tags.includes("how") ? HOW : WALK, "walk_close"); },
  ask_touristy(c, slots) { aboutSpot(c, slots, TOURISTY, "tour_quiet"); },
  ask_best_time(c, slots) { aboutSpot(c, slots, TIME, "time_any"); },
  ask_price(c, slots, seg) {
    // "¿Cuánto cuesta el colectivo?": the ride, not the place
    if (seg.tags.includes("ride")) { c.say("fare_colectivo"); return; }
    if (seg.tags.includes("taxi")) { c.say("fare_taxi"); return; }
    aboutSpot(c, slots, PRICE, "price_cheap");
  },
  ask_book(c, slots) { aboutSpot(c, slots, BOOK, "book_no"); },
  ask_open(c, slots) { aboutSpot(c, slots, OPEN, "open_generic"); },
  ask_worth(c, slots) { aboutSpot(c, slots, {}, "worth"); },
  ask_safe(c) { c.say("safe"); },
  no_crowds(c) { c.say("no_crowds"); c.s.topic = "malecon"; if (!c.s.recs.includes("malecon")) c.s.recs.push("malecon"); c.s.sightRec = true; },
  no_walk(c, _slots, seg) {
    // "¿Dónde tomo un taxi?", "¿Puedo ir en taxi?" · "¿Dónde tomo el colectivo?" · "¿Pasa un colectivo?"
    if (seg.tags.includes("taxi")) { c.say("taxi_where"); return; }
    if (seg.tags.includes("buswhere")) { c.say("bus_where"); return; }
    if (seg.tags.includes("bus")) { c.say("bus_yes"); return; }
    c.say(["cenote", "ruinas"].includes(c.s.topic) ? "no_walk_bus" : "no_walk_taxi");
  },
  // "¿Dónde hay un cajero?", "¿Dónde está el mercado?": the way from her bench, or Información Turística
  ask_place(c, slots, seg) {
    const p = (slots.place as string | undefined) ?? (seg.tags.includes("cash") ? "banco" : undefined);
    c.say((p && WHERE[p]) || "where_other");
  },
  her_name(c) { c.say("her_name"); },
  thanks_tip(c) {
    c.say("thanks_reply");
    if (c.step === "more") c.s.moreDone = true;
  },
  more_no(c) { c.s.moreDone = true; },
  // "¡Suena muy bien! ¡Adiós!" to "¿Algo más?": both tips are given, so the task is done. A goodbye before the
  // tips just ends it, as everywhere.
  g_bye(c) {
    if (c.s.foodRec && c.s.sightRec && !conv(c).completed) { c.s.moreDone = true; c.complete(); c.say("closing"); }
    c.say("g_bye"); c.end(); c.hold();
  },
  g_thanks(c) {
    c.say("thanks_reply");
    if (c.step === "more") c.s.moreDone = true;
    if (conv(c).completed) c.hold();
  },
  from_ctx(c, slots, seg) {
    c.s.fromDone = true;
    c.s.fromAnswered = true;
    const id = (slots.country as string | undefined) ?? ["usa", "canada", "uk", "ireland", "australia"].find((x) => seg.tags.includes(x));
    c.say(id === "canada" ? "from_canada" : id === "australia" || id === "nz" ? "from_far" : "from_other");
  },
  ask_rosa_from(c) { c.say("local_yes"); c.s.local = true; },
  weather_ok(c, _slots, seg) { c.say(seg.tags.includes("hot") ? "weather_hot" : "weather_reply"); },
  // only parsed while "¿Ya probó…?" is open (the pending question answers them first)
  tried_yes_ctx(c) { c.say("tried_yes"); },
  tried_no_ctx(c) { c.say("tried_no"); },
  // "Perfecto, gracias" is thanks, not an answer to "¿Cómo está?"
  g_howareyou_answer(c, slots) {
    const h = (c.heard || "").toLowerCase();
    if (/\bgracias\b/.test(h) && !/(y usted|y tú|y tu|y a usted|cómo está|como esta)/.test(h) && conv(c).pending?.id !== "howareyou") { H.thanks_tip(c, slots, { intent: "thanks_tip", slots, tags: [] }); return; }
    GLOBAL_HANDLERS.g_howareyou_answer(c as ConvCtx, slots);
  },
  help_me(c) {
    // "¿Me puede ayudar? Busco un restaurante": the request itself follows, no need to ask
    if (!/(busco|dónde|donde|recomi|comer|ver|restaurante|café|cafe|visitar|conocer|hacer)/i.test((c.heard || "").replace(/me puede ayudar|me podría ayudar|me podria ayudar|una pregunta/gi, ""))) c.say("help_sure");
  },
  not_far(c, slots, seg) { aboutSpot(c, slots, seg.tags.includes("price") ? PRICE : WALK, seg.tags.includes("price") ? "price_cheap" : "walk_close"); },
  hungry_ctx(c) { if (!c.s.foodRec) c.s.wantFood = true; else c.say("no_problem"); },
  // vegetarian: the papadzules at Lucía's; vegan or on a budget: the cocina económica
  diet(c) {
    setVeg(c);
    if (recFree(c)) c.say("no_problem");
    recFood(c, "vegetariana", !!c.s.cheap);
  },
  // a place named on its own while she asks what they'd like to see: "El cenote, tal vez"
  spot_ctx(c, slots, seg) { H.ask_about_spot(c, slots, seg); },
  // "No me gustan los museos": no museum tip, another sight instead
  sight_neg(c, slots, seg) {
    const id = (slots.spot as string | undefined) ?? (seg.tags.includes("art") ? "museo" : seg.tags.includes("ruins") ? "ruinas" : seg.tags.includes("beach") ? "playa" : undefined);
    if (id) { c.s.avoidSight = [...(c.s.avoidSight || []), id]; c.s.recs = c.s.recs.filter((x: string) => x !== id); }
    c.say("no_problem");
    if (!c.s.sightRec || c.s.topic === id || (id && KIND[c.s.topic] !== "sight")) recommend(c, anotherSight(c));
  },
  // answers to "¿Quiere que lo acompañe?" (the pending's yes/no may already have answered)
  walk_yes_ctx(c) { if (c.s.walkAnswered) return; c.s.walkAnswered = true; c.say("walk_yes"); c.event("follow", { npc: "rosa", to: c.s.topic }); },
  walk_no_ctx(c) { if (c.s.walkAnswered) return; c.s.walkAnswered = true; c.say("walk_no"); },
};

/** Every situation handler reacts once per utterance, and any real request ends the opening question. */
function wrap(hs: Record<string, Handler>): Record<string, Handler> {
  const out: Record<string, Handler> = {};
  for (const [id, h] of Object.entries(hs)) {
    out[id] = (c, slots, seg) => {
      if (!onceThisTurn(c, "h:" + id)) return;
      if (!["are_you_local", "weather_ok", "g_thanks", "help_me", "tried_yes_ctx", "tried_no_ctx", "buy_produce", "ask_rosa_from"].includes(id)) c.s.asked = true;
      h(c, slots, seg);
    };
  }
  return out;
}

/** Common nouns take their article ({X.the}); names don't. Plural places get their own hint (¿Están…?). */
const notPl = (e: EntityDef) => !e.attrs?.pl && !e.attrs?.name && e.attrs?.kind !== "night";

// ---------------------------------------------------------------------------

export const local: SituationDef = {
  id: "s69-local",
  song: 69,
  songTitle: "What Would You Recommend?",
  title: { en: "¿Qué me recomienda?", lt: "What would you recommend?" },
  topic: { en: "Consejos de una vecina", lt: "Asking a local for tips" },
  chapter: 2,
  order: 3,
  location: "town-square",
  npc: "rosa",
  goal: "Ask a local for tips: where to eat and what to see. Then ask a follow-up question or two.",
  intro: "The zócalo. Doña Carmen sits on her bench by the bandstand, fanning herself. She was born and raised in Puerto Colibrí and knows every corner of it, from the best cochinita to the quietest cenote.",
  entities: { spot: SPOTS, cuisine: CUISINES, country: COUNTRIES, place: PLACES },

  grammar: {
    macros: {
      aqui_: "(aqui | por aqui | aqui cerca | cerca | cerca de aqui | por aqui cerca | por aca | aca | en el pueblo | en puerto colibri | en la zona | por la zona | en este pueblo | del pueblo)",
      rec_v: "(recomienda | recomendaria | sugiere | aconseja | recomiendas #tip:tu_staff | recomendarias #tip:tu_staff | recomiendan)",
      lugar: "(lugar | lugares | restaurante | restaurantes | sitio | sitios | lugarcito | fonda | fondas | restaurant)",
      budget: "(barato #cheap | barata #cheap | economico #cheap | economica #cheap | no (muy | tan | demasiado) caro #cheap | no (muy | tan | demasiado) cara #cheap | que no sea (muy | tan | demasiado)? (caro | cara) #cheap | sencillo #cheap | bueno y barato #cheap | elegante #fancy | especial #fancy | romantico #fancy | bonito #nice)",
      de_: "(de | del | de la | de los | de las | sobre | sobre el | sobre la | sobre los | sobre las)",
      a_: "(a | al | a la | a los | a las | hasta | hasta el | hasta la)",
      produce: "[la | el | las | los | unas | unos | un | una | un kilo de | medio kilo de | algo de] (fruta | frutas | verdura | verduras | mango | mangos | papaya | papayas | pina | pinas | platano | platanos | aguacate | aguacates | naranja | naranjas | limon | limones | sandia | sandias | jitomate | jitomates | tomate | tomates | coco | cocos | artesania #craft | artesanias #craft | hamaca #craft | hamacas #craft | recuerdos #craft | sombrero #craft | sombreros #craft)",
      comer_: "(comer | cenar | almorzar | desayunar | comer algo | cenar algo)",
    },
  },

  intents: {
    are_you_local: { patterns: [
      "(es | eres #tip:tu_staff) de aqui #h:l_from", "usted es de aqui", "(es | eres #tip:tu_staff) de (por aqui | por aca | este pueblo | puerto colibri)", "(es | eres) de aqui verdad",
      "[usted] (vive | vives #tip:tu_staff) (aqui | por aqui | en el pueblo | en puerto colibri) #h:l_live", "(es | eres) (local | de la zona)",
      "(conoce | conoces #tip:tu_staff) bien (el pueblo | puerto colibri | la zona) #h:l_local", "(lleva | llevas) mucho tiempo (aqui | viviendo aqui | en el pueblo)", "(nacio | naciste) aqui", "(hace cuanto | cuanto tiempo) (vive | lleva viviendo | tiene viviendo | lleva) aqui",
    ] },
    ask_rosa_from: { patterns: ["de donde es [usted]", "de donde eres #tip:tu_staff"] },
    recommend_vague: { patterns: [
      "que me @rec_v #h:r_what", "que me @rec_v (hacer | a mi | para hoy | para un turista | para una turista | para alguien nuevo | para alguien nueva)",
      "(tiene | tienes #tip:tu_staff) (alguna | algunas | una | unas)? (recomendacion | recomendaciones | sugerencia | sugerencias | idea | ideas | consejo | consejos) #h:r_tips",
      "@could_you (dar | darme | recomendar) (algunas | unas | alguna | una | algunos | unos)? (recomendacion | recomendaciones | sugerencia | sugerencias | ideas | consejos | consejo)",
      "(soy | estoy | somos | estamos) (nuevo | nueva | nuevos | nuevas | de visita | de vacaciones | de paseo | turista | turistas) [aqui | en el pueblo]",
      "(necesito | quisiera | me gustaria | busco) (unas | algunas)? (recomendaciones | ideas | sugerencias | consejos)", "que (me)? (aconseja | sugiere)", "que hay de bueno [@aqui_]",
      "@could_you ayudar con (una | unas | algunas)? (recomendacion | recomendaciones | ideas | sugerencias)", "@could_you (recomendar | recomendarme | dar | darme) algo",
      "no se (que hacer | a donde ir | que hacer aqui | por donde empezar)", "no (soy | somos) de (aqui | por aqui | este pueblo) [que me @rec_v | (tiene | tienes #tip:tu_staff) (alguna | algunas)? (recomendacion | recomendaciones | consejos | ideas)]",
    ] },
    kind_ctx: { patterns: [
      "[para] (comer #food | comida #food | algo de comer #food | algo para comer #food | un lugar para comer #food | restaurantes #food | un restaurante #food) #h:kd_food",
      "(algo que ver #sight | algo para ver #sight | que ver #sight | lugares para visitar #sight | lugares que visitar #sight | pasear #sight | conocer #sight | lugares #sight | algo que hacer #sight | visitar #sight) #h:kd_see",
      "(las dos cosas #both | los dos #both | las dos #both | ambos #both | ambas #both | ambas cosas #both | de todo #both) #h:kd_both", "(comida | comer) y (lugares | algo que ver | pasear | conocer) #both",
    ] },
    ask_food: { patterns: [
      "@could_you (recomendar | recomendarme) (un | una | algun | alguna)? [buen | buena] @lugar (para | donde) (comer | cenar | almorzar) [@aqui_] #h:f_recommend",
      "@could_you (recomendar | recomendarme) (un | algun)? [buen] @lugar [@budget] [@aqui_]",
      "donde (se come | puedo comer | podemos comer | como | comemos) (bien | rico | sabroso)? [@aqui_] #h:f_where_good",
      "(conoce | conoces #tip:tu_staff) (un | algun)? [buen] @lugar [bueno] [para comer | donde comer] [@budget] [@aqui_]",
      "hay (un | algun)? [buen] (restaurante | lugar para comer | lugar donde comer) [bueno] [@budget] [@aqui_]",
      "(busco | estoy buscando | ando buscando) (un | algun)? @lugar (para | donde) comer [@aqui_] [@budget] #h:f_cheap",
      "(busco | estoy buscando | ando buscando) (un | algun)? @lugar @budget [para comer] [@aqui_]",
      "(tengo | tenemos) [mucha | muchisima | un poco de] hambre [donde (puedo | podemos) comer | a donde (voy | vamos | puedo ir | podemos ir) | que me @rec_v] #h:hg_hungry", "(me muero | nos morimos) de hambre",
      "donde (puedo | podemos) (comer | probar) {cuisine} [@aqui_] #h:f_cuisine",
      "donde (hay | venden | sirven | dan | preparan | hacen) [buenos | buenas | buen | buena | ricos | ricas | rico | rica | el mejor | la mejor | los mejores] {cuisine} [@aqui_]",
      "(hay | conoce) (un | algun)? [buen] (lugar | restaurante | sitio) de {cuisine} [@aqui_] #h:f_cuisine_place",
      "que me @rec_v para (comer #meal | la comida #meal | cenar #meal | la cena #meal | almorzar #meal | desayunar | el desayuno) #h:f_lunch",
      "(quiero | quisiera | me gustaria | queremos | quisieramos) (comer | probar) {cuisine} [@aqui_] [donde (puedo | podemos) ir]",
      "(quiero | quisiera | me gustaria | queremos) comer algo [rico | bueno | sabroso] [pero] [@budget]",
      "donde (puedo | podemos) @comer_ [rico | bueno | sabroso] [@aqui_]", "donde @comer_ [@aqui_]",
      "que (hay | se puede comer) (de bueno)? para comer [@aqui_]", "que es (bueno | rico) para comer [@aqui_]",
      "que (comida | platillo)? es tipico [de aqui] [para comer] #typical", "que (se come | comen) aqui #typical",
      "(un | algun) @lugar para @comer_ [@aqui_]", "y para comer [que me recomienda]",
      "donde puedo (encontrar | conseguir) {cuisine} [@aqui_] #h:f_cuisine",
      "que (platillo | platillos | comida | plato | platos | cosa | cosas) [tipico | tipicos | tipica | tipicas | de aqui] (me)? @rec_v [probar | comer] #typical",
      "que (debo | tengo que | puedo | deberia | hay que) (probar | comer) [@aqui_] #typical", "que me @rec_v (probar | comer) #typical",
      "(busco | estoy buscando | quiero | necesito) (un | una | algun)? (restaurante | lugar | sitio | marisqueria | taqueria | fonda) de {cuisine} [@aqui_]",
      "(busco | estoy buscando | necesito) (un | algun)? (restaurante | lugar para comer | lugar donde comer) [bueno] [@aqui_]",
      "(que | como) (son | es) {cuisine}",
      "donde hay (un | una | algun | alguna)? [buen | buena] (taqueria | marisqueria | fonda | cocina economica | lugar para comer | restaurante) [@budget] [@aqui_]",
      "(me)? @rec_v (un | algun | alguna)? (restaurante | lugar | sitio | taqueria) [para comer] [@budget] [@aqui_]", "(que | cual) (restaurante | lugar | taqueria) (me)? @rec_v",
      "(tengo | tenemos) ganas de (comer | probar) {cuisine}", "(tengo | tenemos) ganas de (comer | cenar) [algo] [@budget]", "no se (donde | a donde) (comer | ir a comer | cenar)",
      "no hay (un | algun) @lugar @budget [@aqui_]", "(donde | que) (puedo | podemos) (comer | cenar) (hoy | esta noche | ahorita | ahora)",
      "(algun | un) (restaurante | lugar) (bueno | rico | barato) [@aqui_]", "hay [algo | algun lugar | un lugar] [de] {cuisine} [@aqui_]", "y no hay {cuisine} [@aqui_]", "[y] (otro | algun otro) (restaurante | lugar para comer | lugar donde comer | lugar para cenar) [@aqui_]", "(conoce | conoces #tip:tu_staff) {cuisine} [@aqui_]",
      "(hay | conoce | conoces #tip:tu_staff | busco) (un | algun)? (lugar | restaurante | sitio) @budget de {cuisine} [@aqui_]", "(hay | conoce | conoces #tip:tu_staff | busco) [algo | algun lugar | un lugar] [de] {cuisine} @budget [@aqui_]", "y (para | de) (comer | cenar | desayunar) (que | donde)", "y para (comer | cenar | almorzar | desayunar) [que me @rec_v | donde]", "y (un | algun) (restaurante | lugar para comer) [@aqui_]",
    ] },
    food_ans: { patterns: [
      "[me gustaria | quiero | quisiera | se me antoja | se me antojan | se me antojo | me apetece | me apetecen | me encanta | me encantan | me gusta | me gustan | prefiero | creo que | tal vez | algo de | yo creo que] {cuisine} [por favor | tal vez | creo] #h:k_cuisine",
      "(lo que sea | cualquier cosa | de todo | me da igual | lo que usted (diga | recomiende | me recomiende) | usted (diga | escoja | elija) | sorprendame | no importa | como guste | lo que me recomiende | lo que recomiende) #any #h:k_anything",
      "lo que (sea | usted diga) esta bien #any", "[lo que sea] no soy (exigente | delicado | delicada | especial | dificil) [para comer] [lo que sea] #any", "no se [lo que sea | lo que usted diga] #any", "(como | comemos) de todo #any", "no (soy | somos) (vegetariano | vegetariana | vegetarianos | vegetarianas | vegano | vegana | veganos | veganas) [pero | asi que] (como | comemos) de todo #any", "(que | cual) es lo mas (popular | rico | pedido) #any",
      "(quiero | quisiera | me gustaria) probar {cuisine} #h:k_want",
      // corrections: "No tacos, mariscos", "Nada de tacos, mejor mariscos", "Mariscos, no tacos"
      "(no | nada de | sin | no quiero) {bad:cuisine} (sino | mejor | prefiero)? {cuisine}", "[el | la | los | las] {bad:cuisine} no (sino | mejor | prefiero)? {cuisine}", "{cuisine} (no | y no | pero no) {bad:cuisine}", "{cuisine} o {cuisine2:cuisine}", "(no tengo | sin) (preferencia | preferencias) #any", "lo que (coma | come | comen) la gente de aqui #typical", "algo (rico | bueno) #any", "no se (algo | lo que sea | cualquier cosa) [rico | bueno] #any", "algo con {cuisine}", "lo mas tipico #typical", "algo de la region #typical",
    ] },
    food_neg: { patterns: [
      "no (como | comemos | puedo comer | me gusta | me gustan | quiero | me encanta | me encantan | me apetece) {cuisine} #h:k_not", "no {cuisine}", "[el | la | los | las] {cuisine} no", "sin {cuisine}", "nada de {cuisine}",
      "(soy | es que soy) (alergico | alergica) (a | al) {cuisine}", "(cualquier cosa | lo que sea | todo) menos {cuisine}", "no me (gusta | gustan) mucho {cuisine}", "no soy (fan | muy fan) de {cuisine}", "[el | la | los | las] {cuisine} no me (gusta | gustan | gustan mucho)", "[el | la | los | las] {cuisine} no (como | puedo comer)",
    ] },
    budget: { patterns: [
      "[algo | un lugar | algun lugar | un sitio] [que sea] @budget #h:k_cheap", "(quiero | busco | prefiero | necesito) (algo | un lugar | algun lugar | un sitio) [que sea] @budget",
      "nada (caro | elegante | lujoso | muy caro) #cheap", "no quiero gastar (mucho | tanto) #cheap", "(algo | un lugar) (para | con) (poco presupuesto | un presupuesto bajo) #cheap", "(no tengo | tengo poco | no traigo) (mucho)? (dinero | presupuesto) #cheap", "algo (para | con) poco dinero #cheap",
    ] },
    too_expensive: { patterns: [
      "(es | suena | eso es | esta | se oye) (muy | un poco | demasiado | algo | bastante) (caro | cara) [para mi]", "(eso | uy | ay) (que | muy) (caro | cara)", "uy (que)? caro",
      "(hay | conoce | tiene) (algo | algun lugar | otro lugar | uno | una opcion) mas (barato | barata | economico | economica)", "algo mas (barato | economico)", "no me alcanza [para eso]",
      "(no tengo | no traigo) tanto dinero", "(es | suena) mucho dinero [para mi]", "(algo | un lugar) que sea mas barato",
    ] },
    not_hungry: { patterns: [
      "no tengo (mucha)? hambre [todavia | ahorita | ahora | ya]", "(todavia | ahorita | ahora) no tengo hambre", "(ya | acabo de) (comi | comer | desayuné | desayunar | comimos | desayunamos) [{cuisine}]", "ya (he | hemos) (comido | desayunado | cenado) [{cuisine}]",
      "(tal vez | quizas | a lo mejor) (mas tarde | despues | luego)", "(estoy | ya estoy) (lleno | llena)", "ahorita no",
    ] },
    ask_sight: { patterns: [
      "que vale la pena (ver | visitar | conocer) [@aqui_] #h:s_worth", "que (puedo | debo | podemos | debemos | se puede) (ver | visitar | conocer | hacer) [@aqui_] [mientras estoy aqui] #h:s_should_see",
      "que no me (puedo | debo) perder [@aqui_] #h:s_miss", "que no (hay que | se puede) perder",
      "(hay | habra) algo (interesante | bonito | divertido | especial) (que | para) (ver | hacer | visitar) [@aqui_] #h:s_anything",
      "que es lo mejor (que | para) (ver | hacer) [@aqui_]", "que (lugares | sitios) [me] @rec_v (visitar | conocer | ver) #h:s_recommend", "que me @rec_v (visitar | conocer | ver) #h:s_recommend",
      "que hay (que | para) (ver | hacer | visitar | conocer) [@aqui_]", "que (lugares | sitios) (puedo | debo | podemos) (visitar | conocer)", "que hacen los turistas [@aqui_]",
      "a donde (puedo | debo | podemos) ir [@aqui_]", "(me gusta | me encanta | me interesa) (el arte #art | la historia #art | la cultura #art)", "(me gustan | me encantan | me interesan) (los museos #art | las ruinas #ruins | los cenotes #cenote | las playas #beach)",
      "(me gusta | me encanta) (la naturaleza #nature | nadar #nature | caminar #nature | la playa #beach | el mar #beach | bucear #sea | el snorkel #sea | esnorquelear #sea)",
      "(vengo | estoy | estamos | viajo | viajamos) con (ninos #kids | mis hijos #kids | los ninos #kids | la familia #kids | mi familia #kids)", "algo (para | con) (ninos #kids | la familia #kids)",
      "(me gusta | me encanta) (ir de compras #shop | comprar artesanias #shop | comprar recuerdos #shop)", "(me gustan | me encantan) los mercados #shop",
      "que mas (puedo | podemos | hay que | se puede) (ver | hacer | visitar) #else", "(hay | tiene) otra (cosa | idea | opcion) #else", "otro lugar [que me recomiende] #else", "(otra | alguna otra) (idea | sugerencia | recomendacion) #else",
      "algo (con | de) (buena | bonita)? vista #view", "donde (puedo | se puede | podemos) ver el (atardecer | amanecer) #view", "algo (historico #art | cultural #art | maya #ruins)",
      "[donde] (hay | esta | queda) (un | algun | el)? (lugar | sitio) [bonito | bueno | mejor] para ver el (atardecer | amanecer) #view", "(cual | donde) es el mejor (lugar | sitio) para ver el (atardecer | amanecer) #view",
      "que es lo mas (famoso | conocido | bonito | popular) [@aqui_]", "(quiero | quisiera | me gustaria) (nadar #cenote | ver ruinas #ruins | ir a la playa #beach | ver el mar #beach)",
      "(algo | un lugar) (tranquilo #quiet | bonito) para (pasear | caminar) #nature", "que se puede hacer (hoy | manana | en la tarde | esta tarde)",
      "que (lugares | sitios | cosas) (bonitos | bonitas | interesantes | turisticos | turisticas) (hay | puedo ver | se pueden ver) [@aqui_]", "(quiero | quisiera | me gustaria) (conocer | ver | recorrer) (el pueblo | la zona | los alrededores | todo)",
      "que hago (hoy | manana | aqui | esta tarde)", "a donde (me)? @rec_v (ir | que vaya)", "que (atracciones | actividades) hay [@aqui_]",
      "(me gustaria | quiero | quisiera) (hacer snorkel #sea | bucear #sea | esnorquelear #sea | ver tortugas #sea | ver peces #sea | nadar en un cenote #cenote)", "no se (que | a donde) (ver | visitar | ir a ver)", "(donde | a donde) (puedo | podemos) (pasear | ir de paseo)", "que lugares (hay | tiene) [@aqui_] (para visitar)?",
    ] },
    spot_ctx: { patterns: ["[tal vez | y | que tal | y que tal | y si | quiza | a lo mejor | mejor | prefiero] {spot} [tal vez | quiza]"] },
    sight_neg: { patterns: [
      "no me (gusta | gustan | interesa | interesan | encanta | encantan) {spot}", "no me (gusta | interesa) (el arte #art | la historia #art | la playa #beach | nadar #beach)",
      "no me (gustan | interesan) (los museos #art | las ruinas #ruins | las playas #beach)", "no (quiero | quisiera | pienso) (ir @a_ | ver | visitar | conocer) {spot}", "{spot} no [gracias]", "no me (gustaria | interesa | apetece) (ir @a_ | ver | visitar | conocer) {spot}", "prefiero no (ir @a_ | ver | visitar) {spot}", "(ya | ya lo | ya la | ya los | ya las) (conozco | vi | visité) {spot}", "ya (fui | estuve) (@a_ | en | en el | en la) {spot}",
    ] },
    ask_about_spot: { patterns: [
      "(vale | merece) la pena {spot} #h:p_worth", "(vale | merece) la pena (ir @a_ | visitar | conocer | ver) {spot}", "{spot} vale la pena", "que tal (es | esta)? {spot} #like", "(conoce | ha ido a | ha estado en | fue a) {spot}", "que es {spot} #what", "como es {spot} #like",
      "@could_you (contar | hablar | decir) (algo)? @de_ {spot} #like", "que me (dice | cuenta) @de_ {spot} #like", "y {spot} #like", "hay (algun | alguna | algunos | algunas)? {spot} [@aqui_]", "(prefiero | mejor) {spot}", "(donde | por donde) (hay | queda) {spot} #where",
      "(quiero | quisiera | me gustaria | queremos) (ir a | ir al | conocer | ver | visitar | probar) {spot}", "{spot} es (bueno | bonito | buena | bonita | interesante)",
      "que son {spot} #what", "como son {spot} #like", "y que tal {spot} #like", "y (de | sobre) {spot} #like",
      // corrections: "No quiero ir al museo, prefiero la playa", "El cenote no, las ruinas"
      "no (quiero ir @a_ | quiero | me interesa | me gusta | me gustan | me interesan) {bad:spot} (prefiero | mejor | sino)? {spot}", "no {bad:spot} (sino | mejor | prefiero)? {spot}",
      "{bad:spot} no (sino | mejor | prefiero)? {spot}",
    ] },
    ask_favorite: { patterns: [
      "cual es su (lugar | sitio | rincon) favorito [@aqui_] #h:s_favorite", "cual es tu (lugar | sitio) favorito #tip:tu_staff", "(a donde | donde) le gusta ir [a usted]",
      "que es lo que mas le gusta [del pueblo | de aqui]", "a donde va usted",
    ] },
    ask_locals: { patterns: [
      "a donde (va | van) (la gente de aqui | los de aqui | los locales | ustedes) #h:f_locals", "donde (come | comen) (la gente de aqui | los de aqui | los locales | ustedes) #h:f_locals",
      "a donde (iria | va | ira) usted", "que hace (la gente | la gente de aqui) [el fin de semana | los domingos] #do", "que hacen (los locales | ustedes | los de aqui) [el fin de semana | los domingos] #do",
    ] },
    ask_night: { patterns: [
      "que (hay | se puede hacer) (que hacer | para hacer)? (en la noche | de noche | por la noche | esta noche | en las noches) #h:n_night", "que (hay | se puede hacer) [@aqui_] (en la noche | de noche | esta noche)",
      "(hay | habra) (musica en vivo | vida nocturna | baile | fiesta | bares | antros | algun bar) [@aqui_]", "donde (puedo | podemos | se puede) (escuchar | oir) musica [en vivo]",
      "a donde (puedo | podemos) ir (en la noche | esta noche | de noche)", "que (hacemos | hago | puedo hacer | podemos hacer) (esta noche | en la noche | de noche)", "(y)? (en la noche | de noche) (que hay | que hago)",
    ] },
    ask_coffee: { patterns: [
      "donde (hay | tomo | puedo tomar | venden) (un)? (buen | rico | el mejor)? cafe [@aqui_] #h:c_best_coffee", "(hay | conoce) (una | alguna) [buena] (cafeteria | cafe) [@aqui_]",
      "donde esta el mejor cafe [@aqui_]", "(quiero | necesito | se me antoja) un (cafe | cafecito)", "donde (puedo | podemos) tomar un cafe",
    ] },
    ask_walk: { patterns: [
      "(se puede | puedo | podemos) (ir | llegar) (caminando | andando | a pie) [@a_ {spot}] #h:u_walk", "(esta | queda) (lejos | cerca) [de aqui] #h:u_far", "{spot} (esta | queda) (lejos | cerca) [de aqui]",
      "(esta | queda) (lejos | cerca) {spot} [de aqui] #h:p_far", "{spot} (estan | quedan) (lejos | cerca) [de aqui]", "(estan | quedan) (lejos | cerca) [{spot}] [de aqui]", "que tan lejos (esta | queda) [{spot}]", "a cuanto (esta | queda) [{spot}]",
      "como (llego | llegamos | le hago para llegar | se llega | voy | vamos) [@a_ {spot} | ahi | alla] #how #h:u_how", "como (me voy | se va) [@a_ {spot} | para alla | alla] #how", "como (puedo | podemos) (ir | llegar) [@a_ {spot} | ahi | alla] #how", "como (le hago | hago) para (ir | llegar) [@a_ {spot} | ahi | alla] #how",
      "(que tan lejos | a que distancia) (esta | queda) [{spot}]", "(esta | queda) (lejos | cerca) (de aqui)? (caminando | a pie)",
      "cuanto (tiempo)? se hace [caminando | a pie | @a_ {spot}]", "cuanto (tiempo)? se (tarda | tardan | hacen) [caminando | a pie | en colectivo | @a_ {spot}]", "por donde (queda | esta) [{spot}] #how", "donde (queda | esta) {spot} #how",
    ] },
    ask_touristy: { patterns: [
      "hay (muchos | mucho)? (turistas | gente) [ahi | alla] #h:u_touristy", "(esta | es) muy (turistico | turistica | lleno | llena)", "se llena (mucho)?", "(es | esta) (turistico | turistica)",
      "{spot} es (turistico | turistica | muy turistico)", "va mucha gente",
    ] },
    ask_best_time: { patterns: [
      "a que hora (es mejor | conviene) (ir)? #h:u_time", "cual es la mejor hora (para ir)?", "cuando (es mejor | conviene) ir [@a_ {spot}]",
      "(a que hora | cuando) (voy | debo ir | puedo ir) [@a_ {spot}]", "es mejor (ir)? (en la manana | en la tarde | temprano)", "cual es el mejor momento (para ir)?",
    ] },
    ask_price: { patterns: [
      "(es | esta) (caro | cara) #h:u_expensive", "{spot} es (caro | cara)", "(es | son) (caro | cara | caros | caras) {spot}", "{spot} son (caros | caras)", "cuanto se paga [mas o menos | mas o menos ahi]", "(cuanto | que tanto) (cuesta | cobra | cobran | sale | es) (el colectivo #ride | la combi #ride | el pasaje #ride | el pasaje del colectivo #ride | el taxi #taxi | un taxi #taxi) [@a_ {spot} | para alla | hasta alla]", "(cuanto | que tanto) (cuesta | cuestan | sale) (mas o menos)?", "cuanto (cuesta | cuestan | es | sale) (la comida | comer | cenar | un cafe | la lancha | el paseo) [ahi | alla]", "cuanto (cuesta | cobran | sale | es | vale) [la entrada | {spot}] #h:u_cost",
      "(cobran | se paga | hay que pagar) [la]? entrada", "es (gratis | barato | barata)", "(cuanto | que tanto) se gasta", "cuanto (cuesta | cuestan | vale) (comer | la comida) ahi",
      "(es | sale) (muy)? barato", "(hay que | tengo que) pagar",
    ] },
    ask_book: { patterns: [
      "(hay que | tengo que | necesito | debo) (reservar | hacer reservacion | apartar | hacer una reservacion | reservar mesa) #h:u_book", "(se necesita | necesito) (reservacion | reserva)",
      "(conviene | es mejor) reservar", "no (hay que | tengo que | necesito) reservar", "(hay que | tengo que | necesito) (reservar | hacer reservacion) (antes | con tiempo)", "(hay que | tengo que) comprar (los)? boletos (antes)?", "(aceptan | toman | hacen) reservaciones", "(hay que | tengo que | necesito | debo) (reservar | hacer reservacion | reservar mesa) (en | para) {spot}",
    ] },
    ask_open: { patterns: [
      "(esta | estara) abierto (hoy | ahorita | ahora | {day} | todos los dias) #h:u_open", "a que hora (abre | abren | cierra | cierran) [{spot}]", "(que | cual es el) horario (tiene | tienen)?",
      "(cuando | que dias) (abre | abren | esta abierto)", "hasta (que hora | cuando) (abre | esta abierto | cierran | estan)", "{spot} (abre | esta abierto) (hoy | {day} | todos los dias)",
      "abre (hoy | {day} | todos los dias)", "(cierran | cierra | abren | abre) (tarde | temprano | muy tarde)", "(abre | abren) (en la noche | de noche | en la manana)", "(abren | cierran) (los)? {day}", "(estan | esta) (abiertos | abiertas | abierto | abierta) {spot} [hoy | ahorita | {day}]", "{spot} (estan | esta) (abiertos | abiertas | abierto | abierta) [hoy | ahorita | {day}]", "(que dia | que dias | cuando) hay (musica | musica en vivo | concierto)",
    ] },
    ask_worth: { patterns: ["(vale | merece) la pena [ir | verlo | verla | visitarlo | visitarla | el viaje]", "si vale la pena"] },
    ask_safe: { patterns: [
      "es seguro [@aqui_ | el pueblo | caminar | andar | salir | ir a la playa] (en la noche | de noche | por la noche)? #h:u_safe", "(es | sera) peligroso [@aqui_] (en la noche | de noche)?", "no es (peligroso | peligrosa) [@aqui_] (en la noche | de noche)?", "(es | esta) (peligrosa | peligroso | segura | seguro) [la playa | el centro | el pueblo | el malecon] (en la noche | de noche | por la noche)", "(es | sera) (peligroso | seguro) [ir a | caminar por] (la playa | el malecon | el centro) (de noche | en la noche | por la noche)?", "no (es | sera) (seguro | segura) (en la noche | de noche)?", "(es | sera) peligroso (caminar | salir | andar | ir a la playa) [@aqui_] (de noche | en la noche | por la noche)?",
      "(se puede | puedo) (caminar | andar | salir | ir a la playa) (en la noche | de noche) [sin problema]", "(es | esta) segura la playa (de noche | en la noche)", "la playa es segura (de noche | en la noche)", "hay peligro [@aqui_]",
    ] },
    no_crowds: { patterns: [
      "no me gustan (las multitudes | los lugares turisticos | los lugares llenos | los lugares con mucha gente)", "no me gusta (la gente | lo turistico | cuando hay mucha gente)",
      "(quiero | prefiero | busco) (algo | un lugar) (tranquilo | sin turistas | sin tanta gente) [sin tanta gente]", "algo [mas] tranquilo", "sin (turistas | tanta gente | mucha gente | tantos turistas)",
    ] },
    no_walk: { patterns: [
      "(esta | es) (muy)? lejos para (caminar | ir caminando | ir a pie)", "no quiero caminar (tanto | tan lejos)", "no puedo caminar (tanto | tan lejos)",
      "(hay | pasa) (un)? (camion | autobus | colectivo | combi) [para alla | que vaya | @a_ {spot}] #bus", "(puedo | se puede) ir en (colectivo | camion | autobus | combi) #bus",
      "donde (tomo | puedo tomar | se toma | agarro) (el | un)? (colectivo | camion | autobus | combi) #buswhere", "como me voy en (colectivo | camion | combi) #buswhere",
      // taxis: no sitio near the square (it's by the airport); they pass along the avenue
      "(puedo | se puede) ir en taxi #taxi", "como me voy en taxi #taxi", "donde (tomo | puedo tomar | se toma | agarro | consigo | hay) (un | el)? taxi #taxi",
      "(hay | pasan) taxis [por aqui | aqui | cerca] #taxi", "donde (hay | esta) (un | el)? sitio de taxis #taxi", "hay (un)? sitio de taxis [por aqui | aqui | cerca] #taxi",
      "donde (hay | esta) (una | la)? parada de taxis #taxi", "hay (una)? parada de taxis [por aqui | aqui | cerca] #taxi",
    ] },
    ask_place: { patterns: [
      "(donde | en donde | por donde) (esta | queda | hay | encuentro | puedo encontrar) {place} [@aqui_]", "(como | por donde) (llego | voy | se llega | se va) @a_ {place}",
      "{place} (esta | queda) (lejos | cerca) [de aqui]", "(esta | queda) (lejos | cerca) {place} [de aqui]", "(hay | conoce | sabe de) (un | una | algun | alguna)? {place} (por aqui | cerca | aqui cerca | cerca de aqui)",
      "(busco | estoy buscando | ando buscando | necesito) {place}", "(necesito | tengo que | quiero | quisiera) (sacar | retirar) (dinero | efectivo) #cash", "donde (puedo | se puede) (sacar | retirar) (dinero | efectivo) #cash",
    ] },
    her_name: { patterns: ["[y] [usted] como se llama [usted]", "cual es su nombre", "como te llamas #tip:tu_staff", "[y] cual es tu nombre #tip:tu_staff"] },
    thanks_tip: { patterns: [
      "[muchas | mil | muchisimas] gracias por (el consejo | los consejos | la recomendacion | las recomendaciones | el dato | los datos | la informacion | la sugerencia | las sugerencias | el tip | los tips | las ideas | todo | su ayuda | la ayuda) #h:t_tip", "[muy | super | que] amable [muchas gracias | gracias]",
      "(me ha | me) (ayudado | ayudó) mucho #h:t_helpful", "(suena | se oye) (muy)? (bien | padre | chido | genial | delicioso | rico | increible | perfecto | interesante) #h:t_sounds",
      "(voy a | lo voy a | la voy a | las voy a) (ir | probar | visitar | conocer) [manana | hoy | esta noche | luego | mas tarde] #h:t_check", "(sin falta | seguro) (voy | ire)",
      "(que | muy) buena (idea | recomendacion)", "(muy | super) (util | buena idea)", "(excelente | perfecto | genial | padrisimo | que padre | que chido) [muchas] gracias",
    ] },
    more_no: { patterns: [
      "(es | seria | eso es | eso seria) todo [por ahora] #h:t_all", "(por ahora | por el momento) (es todo | nada mas)", "ya (es)? todo", "ya (estoy | con eso)", "con eso (estoy bien | es suficiente | basta)",
      "(no tengo | ya no tengo) (mas | otras) preguntas", "es todo lo que necesitaba", "(es | eso es | eso seria) todo por (hoy | ahora | el momento)", "[no] creo que (es | seria | eso es) todo", "(nada mas | ya nada mas) eso", "ya (me | nos) (voy | vamos)",
    ] },
    from_ctx: { patterns: [
      "(soy | vengo | somos | venimos) de {country} #h:o_from", "de {country}", "{country}", "(vivo | vivimos) en {country}",
      "(soy | somos) (estadounidense | estadounidenses | americano | americana | gringo | gringa) #usa", "(soy | somos) (canadiense | canadienses) #canada",
      "(soy | somos) (ingles | inglesa | britanico | britanica) #uk", "(soy | somos) (irlandes | irlandesa) #ireland", "(soy | somos) (australiano | australiana) #australia",
      "(de)? (muy)? lejos de {country}", "no soy de {bad:country} (soy | sino) de {country}", "no (soy | vengo) de {bad:country} (sino de | soy de | vengo de) {country}",
    ] },
    tried_yes_ctx: { patterns: [
      "[si] (estuvo | estaba | fue) (delicioso | riquisimo | buenisimo | muy rico | muy bueno | increible | padrisimo | deliciosa | riquisima) #h:tr_delicious",
      "[si] me (encantó | encantaron | gustó | gustaron) [mucho] #h:tr_great", "[si] ya (fui | lo probé | la probé | las probé | los probé | comi ahi | cené ahi)", "[si] (estuvo | fue) (muy)? (bueno | rico | padre | sabroso | buena | rica)", "[si] (fui | fuimos) (ayer | anoche | el otro dia | hoy | esta manana | el lunes | el fin de semana)", "[si] ya (fuimos | comimos ahi | las probé)", "[si] ya (fui | fuimos) (a | al) {spot}",
      "[si] [ya] (fui | fuimos) [y] me (encantó | encantaron | gustó | gustaron) [mucho] (el | la | los | las) {cuisine}", "[si] me (encantó | encantaron | gustó | gustaron) [mucho] (el | la | los | las) {cuisine}",
    ] },
    tried_no_ctx: { patterns: ["[no] todavia no [pero (voy a ir | ya voy | quiero ir)] #h:tr_not_yet", "[no] (aun | todavia) no (he ido | lo he probado | la he probado | fui) [(a | al) {spot}]", "no (he ido | fui | pude ir | tuve tiempo | he tenido tiempo | he podido) [todavia | ir]", "aun no", "[no] (todavia | aun) no (tengo | he tenido) tiempo"] },
    weather_ok: { patterns: [
      "(que | muy) (bonito | lindo | hermoso | bello | precioso) [dia] #h:wt_day", "que dia tan (bonito | lindo | hermoso | precioso) #h:wt_day", "(esta | hace) un dia (precioso | hermoso | bonito | lindo)",
      "(si)? (hace | que) (mucho)? calor #hot #h:wt_hot", "y que calor #hot #h:wt_hot", "(esta | hace) (precioso | bonito | lindo | buen tiempo) [hoy]", "si verdad que si",
    ] },
    walk_yes_ctx: { patterns: [
      "[si] (me encantaria | con mucho gusto | encantado | encantada | claro que si) [gracias] #h:w_yes", "[si] (seria | es) (muy)? (amable | genial | perfecto) [de su parte] #h:w_kind",
      "[si] que amable #h:w_kind", "[si] (vamos | vamonos | vamos juntas | vamos juntos | acompaneme)",
    ] },
    walk_no_ctx: { patterns: [
      "[no] [gracias] no se (preocupe | moleste) [yo] [(llego | voy | me voy) (solo | sola)] [lo encuentro] #h:w_no", "[no] [gracias] (yo)? (llego | voy | me voy) (solo | sola)",
      "[no] [gracias] (puedo | prefiero) ir (solo | sola)", "[no] [gracias] (lo | la) encuentro [yo] [solo | sola]", "[no] [gracias] no (quiero | se) (molestarla | molestar) [gracias]", "[no] [gracias] no hace falta [gracias]",
    ] },
    // The square's stalls are right behind her bench: "Quiero comprar fruta" gets a friendly pointer.
    buy_produce: { patterns: [
      "(quiero | quisiera | necesito | me gustaria) comprar @produce", "donde (puedo comprar | compro | venden | se compra | hay) @produce [@aqui_] #where",
      "(usted)? (vende | venden) @produce", "cuanto (cuesta | cuestan | vale | valen | es | son) @produce", "me (da | vende) @produce", "(un kilo | medio kilo) de @produce",
    ] },
    help_me: { patterns: ["@could_you ayudar[me]", "(me puede | me podria | puedo | le puedo | podria) (ayudar | hacer una pregunta)", "(tengo | le tengo) una pregunta", "una pregunta"] },
    // "No está lejos": a statement (or "¿No está lejos?"), never "is it far?" read the other way round
    not_far: { patterns: ["no (esta | queda) (lejos | tan lejos | muy lejos) [{spot}] [de aqui]", "{spot} no (esta | queda) (lejos | tan lejos | muy lejos) [de aqui]", "no (es | esta) (caro | cara) #price", "no (cuesta | es) mucho #price"] },
    // "¿Y tiene hambre?" – "Sí, mucha." / "Un poco."
    hungry_ctx: { patterns: ["[si] (mucha | muchisima | un poco | bastante | un poquito) [hambre]", "[si] (ya)? me dio hambre"] },
    diet: { patterns: ["(soy | somos) (vegetariano | vegetariana | vegetarianos | vegetarianas | vegano | vegana | veganos | veganas)", "no (como | comemos) (carne | nada de carne) [ni (pescado | pollo | huevo | mariscos)]", "no (como | comemos) (productos animales | nada de origen animal)",
      "[ah | oh] pero (soy | somos) (vegetariano | vegetariana | vegetarianos | vegetarianas | vegano | vegana | veganos | veganas)", "[ah | oh] pero no (como | comemos) carne",
      "(soy | somos) (vegetariano | vegetariana | vegetarianos | vegetarianas) [pero] (si)? (como | comemos) (huevo | huevos | lacteos | queso)",
      "no (soy | somos) (vegano | vegana | veganos | veganas) [pero] no (como | comemos) carne"] },
  },

  lines: {
    // --- openers ----------------------------------------------------------------
    open: [
      t("¡Buenas tardes! | ¿Le | puedo | ayudar | en | algo?", "Good afternoon! | (To) you | I-can | help | with | something?", "Good afternoon! Can I help you with something?"),
      t("Ay, | hola. | Parece | que | anda | conociendo | el | pueblo. | ¿Le | ayudo?", "Oh, | hi. | It-seems | that | you're-going-around | getting-to-know | the | town. | (To) you | I-help?", "Oh, hi! Looks like you're exploring the town. Can I help?", { spain: t("Ay, | hola. | Parece | que | está | conociendo | el | pueblo. | ¿Le | ayudo?", "Oh, | hi. | It-seems | that | you're | getting-to-know | the | town. | (To) you | I-help?", "Oh, hi! Looks like you're exploring the town. Can I help?") }),
    ],
    open_weather: [
      t("¡Buenas tardes, | {m:mijo|f:mija}! | ¡Qué | día | tan | bonito! | ¿Verdad?", "Good afternoon, | dear! | What | a day | so | beautiful! | Right?", "Good afternoon, dear! Beautiful day, isn't it?", { flags: { 1: MIJA }, spain: t("¡Buenas tardes, | {m:hijo|f:hija}! | ¡Qué | día | tan | bonito! | ¿Verdad?", "Good afternoon, | dear! | What | a day | so | beautiful! | Right?", "Good afternoon, dear! Beautiful day, isn't it?") }),
    ],
    weather_reply: [t("¡Precioso! | Bueno, | ¿en | qué | le | puedo | ayudar?", "Lovely! | Well, | in | what | (to) you | I-can | help?", "Lovely! So, how can I help you?")],
    weather_hot: [t("¡Uy, | sí! | Aquí | siempre | hace | calor. | Bueno, | ¿en | qué | le | ayudo?", "Oh, | yes! | Here | always | it-makes | heat. | Well, | in | what | (to) you | I-help?", "Oh yes, it's always hot here! So, how can I help?")],
    tried_hello: [t("¡Ah, | es | usted | otra vez!", "Oh, | it's | you | again!", "Oh, it's you again!")],
    ...Object.fromEntries(Object.entries(TRIED).map(([id, s]) => [`tried_${id}`, [s]])),
    tried_yes: [t("¡Ya | sabía | que | le | iba | a | gustar!", "Already | I-knew | that | (to) you | it-was-going | to | please!", "I knew you'd love it!")],
    tried_no: [t("¡Ay, | no sabe | lo que | se pierde!", "Oh, | you don't know | what | you're missing!", "Oh, you don't know what you're missing!")],
    ask_need: [
      t("Dígame, | ¿qué | se le ofrece?", "Tell me, | what | can I offer you?", "Tell me, what can I do for you?"),
      t("¿En | qué | le | puedo | ayudar, | {m:mijo|f:mija}?", "In | what | (to) you | I-can | help, | dear?", "How can I help you, dear?", { flags: { 5: MIJA }, spain: t("¿En | qué | le | puedo | ayudar, | {m:hijo|f:hija}?", "In | what | (to) you | I-can | help, | dear?", "How can I help you, dear?") }),
    ],
    ask_need_again: [t("¿Busca | dónde | comer, | o | algo | que | ver?", "You-look-for | where | to eat, | or | something | to | see?", "Are you looking for a place to eat, or something to see?")],
    local_yes: [
      t("¡De toda la vida! | Nací | aquí, | en | Puerto | Colibrí.", "All my life! | I-was-born | here, | in | Puerto | Colibrí.", "All my life! I was born right here in Puerto Colibrí."),
      t("¡Claro! | Aquí | nací | y | aquí | crecí.", "Of course! | Here | I-was-born | and | here | I-grew-up.", "I sure am! Born and raised right here."),
    ],
    ask_need_short: [t("Entonces, | ¿algo | para | comer, | o | para | pasear?", "So, | something | for | eating, | or | for | strolling?", "So, somewhere to eat, or somewhere to go?")],
    which_kind: [t("¡Uy, | muchas | cosas! | ¿Para | comer, | o | algo | que | ver?", "Oh, | many | things! | For | eating, | or | something | to | see?", "Oh, lots of things! Something to eat, or something to see?")],
    both_ok: [t("¿Las | dos | cosas? | ¡Muy | bien!", "The | two | things? | Very | good!", "Both? Wonderful!")],

    // --- food ---------------------------------------------------------------------
    ask_cuisine: [
      t("¡Claro! | ¿Qué | se le antoja? | ¿Mariscos? | ¿Algo | típico | de | aquí?", "Sure! | What | do you feel like? | Seafood? | Something | typical | from | here?", "Sure! What do you feel like? Seafood? Something local?", { spain: t("¡Claro! | ¿Qué | le apetece? | ¿Mariscos? | ¿Algo | típico | de | aquí?", "Sure! | What | do you feel like? | Seafood? | Something | typical | from | here?", "Sure! What do you feel like? Seafood? Something local?") }),
      t("¡Con gusto! | ¿Qué | tipo | de | comida | le gusta?", "With pleasure! | What | kind | of | food | do you like?", "Of course! What kind of food do you like?", { spain: t("¡Claro! | ¿Qué | tipo | de | comida | le gusta?", "Sure! | What | kind | of | food | do you like?", "Of course! What kind of food do you like?") }),
    ],
    rec_muelle: [
      t("Para | mariscos, | El Muelle, | en | el | malecón. | Pida | el | pescado | a la talla. | Eso sí, | es | un | poquito | caro.",
        "For | seafood, | El Muelle, | on | the | waterfront. | Order | the | fish | split and grilled. | Mind you, | it's | a | little bit | pricey.",
        "For seafood, El Muelle, on the waterfront. Get the pescado a la talla, the grilled fish. Mind you, it's a bit pricey.",
        { flags: { 9: "a la talla: a whole fish split open, rubbed with a red chili paste and grilled over coals." } }),
    ],
    rec_taqueria: [
      t("Vaya | a | la | taquería | junto | al | mercado. | En | la | mañana | hay | tacos | de | cochinita, | ¡y | es | barato!",
        "Go | to | the | taco place | next | to the | market. | In | the | morning | there are | tacos | of | cochinita, | and | it's | cheap!",
        "Go to the taco place next to the market. In the morning they have cochinita tacos, and it's cheap!",
        { flags: { 13: "cochinita pibil: Yucatán's slow-roasted pork in achiote." }, spain: t("Vaya | a | la | taquería | junto | al | mercado. | Por | la | mañana | hay | tacos | de | cochinita, | ¡y | es | barato!", "Go | to | the | taco place | next | to the | market. | In | the | morning | there are | tacos | of | cochinita, | and | it's | cheap!", "Go to the taco place next to the market. In the morning they have cochinita tacos, and it's cheap!", {flags: {13: "cochinita pibil: Yucatán's slow-roasted pork in achiote."}}) }),
    ],
    rec_taqueria_fish: [
      t("Vaya | a | la | taquería | junto | al | mercado. | Al | mediodía | hay | tacos | de | pescado, | ¡y | son | baratos!",
        "Go | to | the | taco place | next | to the | market. | At | noon | there are | tacos | of | fish, | and | they're | cheap!",
        "Go to the taco place next to the market. At lunchtime they have fish tacos, and they're cheap!"),
    ],
    rec_cocina: [
      t("Vaya | a | la | cocina económica | de | la | calle | Ceiba. | Hay | comida corrida, | y | la | cochinita | es | buenísima.",
        "Go | to | the | home-style diner | on | the | street | Ceiba. | There's | set lunch, | and | the | cochinita | is | excellent.",
        "Try the little home-style diner on Ceiba Street. They do a set lunch, and the cochinita is excellent.",
        { flags: { 3: "cocina económica: a small family place with cheap home cooking.", 9: "comida corrida: soup, rice, a main dish and a drink for one price.", 12: "cochinita pibil: Yucatán's slow-roasted pork in achiote." }, spain: t("Vaya | a | la | cocina económica | de | la | calle | Ceiba. | Hay | menú del día, | y | la | cochinita | es | buenísima.", "Go | to | the | home-style diner | on | the | street | Ceiba. | There's | set lunch, | and | the | cochinita | is | excellent.", "Try the little home-style diner on Ceiba Street. They do a set lunch, and the cochinita is excellent.", {flags: {3: "cocina económica: a small family place with cheap home cooking.",12: "cochinita pibil: Yucatán's slow-roasted pork in achiote."}}) }),
      t("La | cocina económica | de | la | calle | Ceiba. | Pruebe | los | panuchos | y | los | salbutes: | ¡son | de | aquí!",
        "The | home-style diner | on | the | street | Ceiba. | Try | the | panuchos | and | the | salbutes: | they're | from | here!",
        "The home-style diner on Ceiba Street. Try the panuchos and salbutes: they're a local thing!",
        { flags: { 1: "cocina económica: a small family place with cheap home cooking.", 8: "panuchos, salbutes: small fried tortillas with toppings, from Yucatán." } }),
    ],
    rec_cafe: [
      t("El | Café | La Ceiba, | aquí | en | la | avenida | Juárez. | Muy | buen | café, | y | el | pan dulce | está | riquísimo. | ¡Dígale | a | Mariana | que | {m:lo|f:la} | mando | yo!",
        "The | Café | La Ceiba, | here | on | the | avenue | Juárez. | Very | good | coffee, | and | the | pan dulce | is | delicious. | Tell | — | Mariana | that | you | I-send | I!",
        "Café La Ceiba, right here on Juárez Avenue. Great coffee, and the pan dulce is delicious. Tell Mariana I sent you!",
        { flags: { 17: A_TELL, 20: LOLA } }),
    ],
    rec_trattoria: [
      t("La Cocina de Lucía, | en | la | avenida | Juárez. | Es | comida | yucateca: | pruebe | el | poc chuc. | Es | un | poco | más | cara | que | la | cocina económica, | pero | vale la pena.",
        "La Cocina de Lucía, | on | the | avenue | Juárez. | It's | food | Yucatecan: | try | the | poc chuc. | It's | a | little | more | expensive | than | the | home-style diner, | but | it's worth it.",
        "La Cocina de Lucía, on Juárez Avenue. It's Yucatán food: try the poc chuc. It's a bit pricier than the little diner, but it's worth it.",
        { flags: { 10: POC_CHUC, 18: COCINA_EC } }),
      t("Vaya | a | La Cocina de Lucía, | a | una | cuadra | de | aquí. | Es | un | restaurante | yucateco, | un | poco | más | caro | que | la | cocina económica. | Pida | la | sopa | de | lima.",
        "Go | to | La Cocina de Lucía, | at | one | block | from | here. | It's | a | restaurant | Yucatecan, | a | little | more | expensive | than | the | home-style diner. | Order | the | soup | of | lime.",
        "Go to La Cocina de Lucía, a block from here. It's a Yucatán restaurant, a bit pricier than the little diner. Get the sopa de lima, the lime soup.",
        { flags: { 18: COCINA_EC, 21: "sopa de lima: Yucatán's lime soup, usually with chicken, served with crispy tortilla strips." }, spain: t("Vaya | a | La Cocina de Lucía, | a | una | calle | de | aquí. | Es | un | restaurante | yucateco, | un | poco | más | caro | que | la | cocina económica. | Pida | la | sopa | de | lima.", "Go | to | La Cocina de Lucía, | at | one | street | from | here. | It's | a | restaurant | Yucatecan, | a | little | more | expensive | than | the | home-style diner. | Order | the | soup | of | lime.", "Go to La Cocina de Lucía, a block from here. It's a Yucatán restaurant, a bit pricier than the little diner. Get the sopa de lima, the lime soup.", {flags: {18: "cocina económica: a small family place with cheap home cooking.",21: "sopa de lima: Yucatán's lime soup, usually with chicken, served with crispy tortilla strips."}}) }),
    ],
    rec_trattoria_veg: [
      t("Vaya | a | La Cocina de Lucía | y | pida | los | papadzules: | son | de | huevo, | con | salsa | de | pepita, | y | no llevan | carne.",
        "Go | to | La Cocina de Lucía | and | order | the | papadzules: | they're | of | egg, | with | sauce | of | pumpkin seed, | and | they don't have | meat.",
        "Go to La Cocina de Lucía and order the papadzules: egg in a pumpkin-seed sauce, and no meat.",
        { flags: { 6: "papadzules: corn tortillas rolled around chopped hard-boiled egg, in a pumpkin-seed sauce (Yucatán)." } }),
    ],
    rec_cocina_veg: [
      t("Vaya | a | la | cocina económica | de | la | calle | Ceiba. | Dígales | que | no come | carne: | ahí | le | preparan | algo.",
        "Go | to | the | home-style diner | on | the | street | Ceiba. | Tell them | that | you don't eat | meat: | there | (for) you | they-make | something.",
        "Go to the little diner on Ceiba Street. Tell them you don't eat meat, and they'll make you something.", { flags: { 3: COCINA_EC } }),
    ],
    rec_cocina_vegan: [
      t("Vaya | a | la | cocina económica | de | la | calle | Ceiba. | Dígales | que | no come | carne | ni | huevo: | ahí | le | preparan | algo.",
        "Go | to | the | home-style diner | on | the | street | Ceiba. | Tell them | that | you don't eat | meat | or | eggs: | there | (for) you | they-make | something.",
        "Go to the little diner on Ceiba Street. Tell them you don't eat meat or eggs, and they'll make you something.", { flags: { 3: COCINA_EC, 12: "ni: “nor”; after a negative English says “or”." } }),
    ],
    no_italian: [
      t("¡Ay, | {m:mijo|f:mija}, | aquí | no hay | restaurante | italiano! | Pero | la | comida | de | aquí | le | va | a | encantar:",
        "Oh, | dear, | here | there isn't | restaurant | Italian! | But | the | food | from | here | (to) you | it's going | to | delight:",
        "Oh, dear, there's no Italian restaurant here! But you'll love the food from around here:", { flags: { 1: MIJA }, spain: t("¡Ay, | {m:hijo|f:hija}, | aquí | no hay | restaurante | italiano! | Pero | la | comida | de | aquí | le | va | a | encantar:", "Oh, | dear, | here | there isn't | restaurant | Italian! | But | the | food | from | here | (to) you | it's going | to | delight:", "Oh, dear, there's no Italian restaurant here! But you'll love the food from around here:") }),
      t("¿Comida | italiana? | Aquí | no hay, | {m:mijo|f:mija}. | Pero | le | tengo | algo | mejor:",
        "Food | Italian? | Here | there isn't any, | dear. | But | (for) you | I-have | something | better:",
        "Italian food? Not around here, dear. But I've got something better for you:", { flags: { 4: MIJA }, spain: t("¿Comida | italiana? | Aquí | no hay, | {m:hijo|f:hija}. | Pero | le | tengo | algo | mejor:", "Food | Italian? | Here | there isn't any, | dear. | But | (for) you | I-have | something | better:", "Italian food? Not around here, dear. But I've got something better for you:") }),
    ],
    rec_marquesitas: [
      t("¡Las | marquesitas! | Las | venden | en | la | noche, | aquí | en | la | plaza. | Pídala | con | queso de bola: | suena | raro, | ¡pero | es | lo | típico!",
        "The | marquesitas! | Them | they-sell | in | the | evening, | here | in | the | square. | Order-it | with | Edam cheese: | it-sounds | strange, | but | it's | the | classic!",
        "Marquesitas! They sell them in the evening, right here in the square. Get one with Edam cheese: sounds strange, but that's the classic!",
        { flags: { 1: "marquesita: a crispy rolled crêpe, a Yucatán street sweet.", 2: "Las here is a pronoun: them (the marquesitas).", 11: "Pídala: order it (la = una marquesita)." }, spain: t("¡Las | marquesitas! | Las | venden | por | la | noche, | aquí | en | la | plaza. | Pídala | con | queso de bola: | suena | raro, | ¡pero | es | lo | típico!", "The | marquesitas! | Them | they-sell | in | the | evening, | here | in | the | square. | Order-it | with | Edam cheese: | it-sounds | strange, | but | it's | the | classic!", "Marquesitas! They sell them in the evening, right here in the square. Get one with Edam cheese: sounds strange, but that's the classic!", {flags: {1: "marquesita: a crispy rolled crêpe, a Yucatán street sweet.",2: "Las here is a pronoun: them (the marquesitas).",11: "Pídala: order it (la = una marquesita)."}}) }),
    ],
    then_try: [t("Entonces, | mire:", "Then, | look:", "Then how about this:")],
    cheaper: [t("¿Algo | más | barato? | Claro.", "Something | more | cheap? | Sure.", "Something cheaper? Sure.")],
    cheaper_sight: [t("Mmm, | entonces | algo | gratis.", "Hmm, | then | something | free.", "Hmm, then something free.")],
    cheaper_beach: [t("Vaya | a | la | playa | pública, | al | final | del | malecón, | por | el | faro. | ¡No cuesta | nada!", "Go | to | the | beach | public, | at the | end | of the | waterfront, | by | the | lighthouse. | It doesn't cost | anything!",
      "Go to the public beach at the end of the waterfront, by the lighthouse. It doesn't cost a thing!",
      { flags: { 13: "No … nada: Spanish uses a double negative; English says “doesn't cost anything”." } })],
    later_food: [t("Bueno, | cuando | le | dé | hambre, | acuérdese | de | esto:", "Well, | when | (to) you | it-gives | hunger, | remember | of | this:", "Well, when you get hungry, remember this one:")],
    locals_eat: [
      t("¿La | verdad? | La | taquería | junto | al | mercado. | Los | turistas | comen | en | El Muelle, | pero | la | gente | de | aquí | come | tacos.",
        "The | truth? | The | taco place | next | to the | market. | The | tourists | eat | at | El Muelle, | but | the | people | from | here | eat | tacos.",
        "Honestly? The taco place next to the market. Tourists eat at El Muelle, but locals eat tacos."),
    ],
    coffee: [
      t("¡En | el | Café | La Ceiba, | sin duda! | Dígale | a | Mariana | que | {m:lo|f:la} | mando | yo.", "At | the | Café | La Ceiba, | no doubt! | Tell | — | Mariana | that | you | I-send | I.",
        "Café La Ceiba, no question! Tell Mariana I sent you.", { flags: { 6: A_TELL, 9: LOLA } }),
    ],

    // --- things to see --------------------------------------------------------------
    rec_cenote: [
      t("¡Tiene | que | ir | al | cenote! | El | agua | es | cristalina. | Se va | en | colectivo, | como | veinte | minutos.",
        "You-have | to | go | to the | cenote! | The | water | is | crystal-clear. | You go | by | shared van, | about | twenty | minutes.",
        "You have to go to the cenote! The water is crystal clear. You take a colectivo, about twenty minutes.",
        { flags: { 4: "cenote: a natural pool in a limestone sinkhole, typical of the Yucatán.", 11: "colectivo: a shared van that runs along the main road." } }),
      t("No se pierda | el | cenote. | Es | como | nadar | en | una | cueva | de | agua | dulce.", "Don't miss | the | cenote. | It's | like | swimming | in | a | cave | of | water | fresh.",
        "Don't miss the cenote. It's like swimming in a freshwater cave.", { flags: { 2: "cenote: a natural pool in a limestone sinkhole, typical of the Yucatán." } }),
    ],
    rec_playa: [
      t("La | playa, | claro. | La | playa | pública | está | al | final | del | malecón, | por | el | faro, | y | es | gratis.", "The | beach, | of course. | The | beach | public | is | at the | end | of the | waterfront, | by | the | lighthouse, | and | it's | free.",
        "The beach, of course. The public beach is at the end of the waterfront, by the lighthouse, and it's free."),
    ],
    rec_ruinas: [
      t("Vaya | a | las | ruinas, | junto | al | mar. | Son | pequeñas, | pero | muy | bonitas.", "Go | to | the | ruins, | next | to the | sea. | They're | small, | but | very | beautiful.",
        "Go see the Maya ruins by the sea. They're small, but really beautiful."),
    ],
    rec_museo: [
      t("El | Museo | de | la | Costa | Maya | está | aquí | enfrente, | cruzando | la | calle | Ceiba.", "The | Museum | of | the | Coast | Maya | is | here | opposite, | crossing | the | street | Ceiba.",
        "The Museo de la Costa Maya is right across Ceiba Street."),
    ],
    rec_malecon: [
      t("Camine | por | el | malecón | al | atardecer. | Es | precioso.", "Walk | along | the | waterfront | at the | sunset. | It's | lovely.", "Take a walk along the waterfront at sunset. It's lovely."),
    ],
    rec_lancha: [
      t("Vaya | en | lancha | al | arrecife. | A veces | se ven | tortugas.", "Go | by | boat | to the | reef. | Sometimes | you-see | turtles.", "Take a boat out to the reef. Sometimes you see turtles."),
    ],
    rec_puestos: [
      t("Los | puestos | aquí | en | la | plaza: | fruta, | artesanías | y | hamacas.", "The | stalls | here | in | the | square: | fruit, | crafts | and | hammocks.", "The stalls right here in the square: fruit, crafts and hammocks."),
    ],
    rec_musica: [
      t("Los | viernes | hay | música | en vivo | en | el | kiosco, | ¡y | es | gratis!", "On | Fridays | there's | music | live | at | the | bandstand, | and | it's | free!", "On Fridays there's live music at the bandstand, and it's free!",
        { flags: { 0: "Los viernes: on Fridays (the article stands for “on”)." } }),
    ],
    also_museo: [
      t("Y | si | le gusta | el | arte, | el | museo | está | aquí | enfrente.", "And | if | you like | the | art, | the | museum | is | here | opposite.", "And if you like art, the museum is right across the street."),
    ],
    favorite: [t("Ay, | el | malecón | al | atardecer. | Siempre.", "Oh, | the | waterfront | at the | sunset. | Always.", "Oh, the waterfront at sunset. Every time.")],
    locals_do: [
      t("El | sábado | en | la | mañana, | los | puestos | de | la | plaza. | Y | el | viernes | en | la | noche, | la | música | del | kiosco.",
        "On | Saturday | in | the | morning, | the | stalls | of | the | square. | And | on | Friday | in | the | evening, | the | music | of the | bandstand.",
        "Saturday morning, the stalls in the square. And Friday night, the music at the bandstand.", { flags: { 0: "El sábado: on Saturday (the article stands for “on”).", 11: "El viernes: on Friday (the article stands for “on”)." }, spain: t("El | sábado | por | la | mañana, | los | puestos | de | la | plaza. | Y | el | viernes | por | la | noche, | la | música | del | kiosco.", "On | Saturday | in | the | morning, | the | stalls | of | the | square. | And | on | Friday | in | the | evening, | the | music | of the | bandstand.", "Saturday morning, the stalls in the square. And Friday night, the music at the bandstand.", {flags: {0: "El sábado: on Saturday (the article stands for “on”).",11: "El viernes: on Friday (the article stands for “on”)."}}) }),
    ],
    night: [
      t("Los | viernes | hay | música | en vivo | aquí | en | el | kiosco, | a | las | ocho.", "On | Fridays | there's | music | live | here | at | the | bandstand, | at | — | eight.",
        "There's live music right here at the bandstand on Fridays, at eight.", { flags: { 0: "Los viernes: on Fridays (the article stands for “on”).", 10: ART_TIME } }),
    ],
    night_marq: [
      t("Y | en | la | noche | venden | marquesitas | aquí | en | la | plaza. | ¡Pruébelas!", "And | in | the | evening | they-sell | marquesitas | here | in | the | square. | Try them!",
        "And in the evenings they sell marquesitas here in the square. Try them!", { flags: { 5: "marquesita: a crispy rolled crêpe, a Yucatán street sweet." }, spain: t("Y | por | la | noche | venden | marquesitas | aquí | en | la | plaza. | ¡Pruébelas!", "And | in | the | evening | they-sell | marquesitas | here | in | the | square. | Try them!", "And in the evenings they sell marquesitas here in the square. Try them!", {flags: {5: "marquesita: a crispy rolled crêpe, a Yucatán street sweet."}}) }),
    ],
    no_crowds: [t("Entonces | el | malecón, | temprano. | Siempre | está | tranquilo.", "Then | the | waterfront, | early. | Always | it's | quiet.", "Then the waterfront, early in the day. It's always quiet.")],

    // --- follow-ups ----------------------------------------------------------------
    walk_cenote: [t("Caminando, | no. | Está | como | a | veinte | minutos | en | colectivo.", "Walking, | no. | It's | about | at | twenty | minutes | by | shared van.", "Not on foot. It's about twenty minutes by colectivo.", { spain: t("Andando, | no. | Está | como | a | veinte | minutos | en | colectivo.", "Walking, | no. | It's | about | at | twenty | minutes | by | shared van.", "Not on foot. It's about twenty minutes by colectivo.") })],
    walk_ruinas: [t("Está | como | a | media | hora | caminando. | O | tome | un | taxi: | no es | caro.", "It's | about | at | half | hour | walking. | Or | take | a | taxi: | it's not | expensive.", "It's about half an hour on foot. Or take a taxi, it's not expensive.", { spain: t("Está | como | a | media | hora | andando. | O | coja | un | taxi: | no es | caro.", "It's | about | at | half | hour | walking. | Or | take | a | taxi: | it's not | expensive.", "It's about half an hour on foot. Or take a taxi, it's not expensive.") })],
    walk_museo: [t("¡Está | aquí | enfrente, | cruzando | la | calle!", "It's | here | opposite, | crossing | the | street!", "It's right there, across the street!")],
    walk_malecon: [t("Está | aquí | atrás, | a | dos | minutos: | nada más | cruce | la | avenida | del | Puerto.", "It's | here | behind, | at | two | minutes: | just | cross | the | avenue | of the | Harbor.",
      "It's right behind me, two minutes away: just cross Avenida del Puerto.", { spain: t("Está | aquí | atrás, | a | dos | minutos: | solo | cruce | la | avenida | del | Puerto.", "It's | here | behind, | at | two | minutes: | just | cross | the | avenue | of the | Harbor.", "It's right behind me, two minutes away: just cross Avenida del Puerto.") })],
    walk_close: [t("Está | aquí | cerquita, | a | dos | minutos | caminando.", "It's | here | very close, | at | two | minutes | walking.", "It's really close, two minutes on foot.", { flags: { 2: "cerquita: cerca + -ita, “really close”." }, spain: t("Está | aquí | cerquita, | a | dos | minutos | andando.", "It's | here | very close, | at | two | minutes | walking.", "It's really close, two minutes on foot.", {flags: {2: "cerquita: cerca + -ita, “really close”."}}) })],
    walk_here: [t("¡Es | aquí | mismo, | en | la | plaza!", "It's | here | right, | in | the | square!", "It's right here, in the square!")],
    dir_cenote: [
      t("Tome | un | colectivo | en | la | avenida: | son | camionetas | blancas. | Dígale | al | chofer | que | {m:lo|f:la} | deje | en | el | cenote, | y | le | paga | al bajarse.",
        "Take | a | shared van | on | the | avenue: | they're | vans | white. | Tell | to the | driver | that | you | he-leaves | at | the | cenote, | and | (to) him | you-pay | when you get off.",
        "Take a colectivo on the main road: they're white vans. Tell the driver to drop you at the cenote, and pay when you get off.", { flags: { 13: LOLA }, spain: t("Coja | un | colectivo | en | la | avenida: | son | furgonetas | blancas. | Dígale | al | conductor | que | {m:lo|f:la} | deje | en | el | cenote, | y | le | paga | al bajarse.", "Take | a | shared van | on | the | avenue: | they're | vans | white. | Tell | to the | driver | that | you | he-leaves | at | the | cenote, | and | (to) him | you-pay | when you get off.", "Take a colectivo on the main road: they're white vans. Tell the driver to drop you at the cenote, and pay when you get off.", {flags: {13: "lo / la: “you” (usted), for a man / a woman."}}) }),
    ],
    // the ruins: on the rocky point past the beach's west end (TOWN.md "Out of town")
    dir_ruinas: [t("Baje | a | la | playa | y | camine | a la izquierda, | hasta | el | final: | las | ruinas | están | en | las | rocas.", "Go down | to | the | beach | and | walk | to the left, | until | the | end: | the | ruins | are | on | the | rocks.",
      "Go down to the beach and walk left, all the way to the end: the ruins are up on the rocks.")],
    dir_malecon: [t("Pase | entre | los | puestos, | aquí | atrás, | y | cruce | la | avenida | del | Puerto. | Ahí | están | el | malecón | y | la | playa.", "Go | between | the | stalls, | here | behind, | and | cross | the | avenue | of the | Harbor. | There | are | the | waterfront | and | the | beach.",
      "Go between the stalls behind me and cross Avenida del Puerto. The waterfront and the beach are right there.")],
    // El Muelle and the boats: on the malecón to the west, behind the museum
    dir_muelle: [t("Cruce | la | avenida | del | Puerto, | aquí | atrás, | y | camine | a la izquierda | hasta | el | muelle.", "Cross | the | avenue | of the | Harbor, | here | behind, | and | walk | to the left | until | the | pier.",
      "Cross Avenida del Puerto behind me and walk left to the pier.")],
    dir_trattoria: [t("Está | en | la | avenida | Juárez, | a | una | cuadra, | por | allá: | la | del | toldo | rojo.", "It's | on | the | avenue | Juárez, | at | one | block, | over | there: | the one | with the | awning | red.", "It's on Juárez Avenue, one block that way: the one with the red awning.", { spain: t("Está | en | la | avenida | Juárez, | a | una | calle, | por | allá: | la | del | toldo | rojo.", "It's | on | the | avenue | Juárez, | at | one | street, | over | there: | the one | with the | awning | red.", "It's on Juárez Avenue, one block that way: the one with the red awning.") })],
    dir_cafe: [t("Está | en | la | avenida | Juárez, | a | una | cuadra, | por | allá: | enfrente de | Información Turística.", "It's | on | the | avenue | Juárez, | at | one | block, | over | there: | across from | Tourist Information.",
      "It's on Juárez Avenue, one block that way: across from the tourist information office.", { spain: t("Está | en | la | avenida | Juárez, | a | una | calle, | por | allá: | enfrente de | Información Turística.", "It's | on | the | avenue | Juárez, | at | one | street, | over | there: | across from | Tourist Information.", "It's on Juárez Avenue, one block that way: across from the tourist information office.") })],
    dir_cocina: [t("En | la | calle | Ceiba, | cruzando | la | avenida, | a la vuelta | del | banco.", "On | the | street | Ceiba, | crossing | the | avenue, | around the corner | from the | bank.", "On Ceiba Street, across the avenue, just around the corner from the bank.")],
    // the taquería
    dir_mercado: [t("Junto | al | mercado: | por | la | avenida | del | Puerto, | para | allá, | pasando | el | museo.", "Next | to the | market: | along | the | avenue | of the | Harbor, | toward | there, | passing | the | museum.",
      "Next to the market: along Avenida del Puerto, that way, past the museum.")],
    tour_bit: [t("Un | poco, | al | mediodía. | Vaya | temprano: | ese | es | mi | consejo.", "A | little, | at | noon. | Go | early: | that | is | my | advice.", "A bit, around midday. Go early, that's my advice.")],
    tour_muelle: [t("Sí, | un | poco, | pero | la | comida | es | muy | buena.", "Yes, | a | little, | but | the | food | is | very | good.", "Yes, a little, but the food is really good.")],
    tour_market: [t("Un | poco, | los | sábados, | pero | eso | es | parte | de | lo | bonito.", "A | little, | on | Saturdays, | but | that | is | part | of | the | nice-thing.", "A bit on Saturdays, but that's part of the fun!",
      { flags: { 2: "los sábados: on Saturdays (the article stands for “on”)." } })],
    tour_locals: [t("No | mucho. | Va | pura | gente | de | aquí.", "Not | much. | Goes | only | people | from | here.", "Not really. It's mostly locals.", { spain: t("No | mucho. | Solo | va | gente | de | aquí.", "Not | much. | Only | goes | people | from | here.", "Not really. It's mostly locals.") })],
    tour_mixed: [t("Van | turistas | y | gente | de | aquí | también.", "Go | tourists | and | people | from | here | too.", "You get tourists and locals too.")],
    tour_quiet: [t("No | mucho. | Es | muy | tranquilo.", "Not | much. | It's | very | quiet.", "Not really. It's nice and quiet.")],
    time_cenote: [t("Temprano, | cuando | abren. | Al | mediodía | llegan | los | grupos.", "Early, | when | they-open. | At | noon | arrive | the | groups.", "Early, when they open. The tour groups arrive around midday.")],
    time_ruinas: [t("A | las | ocho, | cuando | abren, | antes | del | calor.", "At | — | eight, | when | they-open, | before | the | heat.", "At eight, when they open, before the heat.", { flags: { 1: ART_TIME } })],
    time_sunset: [t("Al | atardecer. | ¡Es | lo | más | bonito!", "At the | sunset. | It's | the | most | beautiful!", "At sunset. It's the most beautiful time!")],
    time_beach: [t("En | la | mañana, | antes de que | pegue | fuerte | el | sol.", "In | the | morning, | before | hits | hard | the | sun.", "In the morning, before the sun gets too strong.", { spain: t("Por | la | mañana, | antes de que | pegue | fuerte | el | sol.", "In | the | morning, | before | hits | hard | the | sun.", "In the morning, before the sun gets too strong.") })],
    time_museo: [t("Entre semana, | en | la | mañana. | Está | muy | tranquilo.", "On weekdays, | in | the | morning. | It's | very | quiet.", "Weekday mornings. It's very quiet then.", { spain: t("Entre semana, | por | la | mañana. | Está | muy | tranquilo.", "On weekdays, | in | the | morning. | It's | very | quiet.", "Weekday mornings. It's very quiet then.") })],
    time_muelle: [t("Para | la | vista, | al | atardecer. | ¡Pero | reserve!", "For | the | view, | at the | sunset. | But | book!", "For the view, at sunset. But book a table!")],
    time_lancha: [t("En | la | mañana, | cuando | el | mar | está | más | tranquilo.", "In | the | morning, | when | the | sea | is | more | calm.", "In the morning, when the sea is calmer.", { spain: t("Por | la | mañana, | cuando | el | mar | está | más | tranquilo.", "In | the | morning, | when | the | sea | is | more | calm.", "In the morning, when the sea is calmer.") })],
    time_taqueria: [t("¡Temprano! | La | cochinita | se acaba | antes | del | mediodía.", "Early! | The | cochinita | runs out | before | the | noon.", "Early! The cochinita runs out before noon.")],
    time_cocina: [
      t("A | la | hora | de | la | comida, | entre | la | una | y | las | tres.", "At | the | hour | of | the | lunch, | between | — | one | and | — | three.", "At lunchtime, between one and three.",
        { flags: { 5: "la comida: in Mexico, the main meal of the day, around 2 p.m.", 7: ART_TIME, 10: ART_TIME } }),
    ],
    time_night: [t("En | la | noche, | después de | las | siete.", "In | the | evening, | after | — | seven.", "In the evening, after seven.", { flags: { 4: ART_TIME }, spain: t("Por | la | noche, | después de | las | siete.", "In | the | evening, | after | — | seven.", "In the evening, after seven.", {flags: {4: "The article before a clock time has no English word."}}) })],
    time_musica: [t("Empieza | a | las | ocho, | pero | llegue | antes | para | encontrar | lugar.", "It-starts | at | — | eight, | but | arrive | before | to | find | place.", "It starts at eight, but come early to get a seat.", { flags: { 2: ART_TIME } })],
    time_market: [t("Temprano, | como | a | las | ocho, | antes | del | calor.", "Early, | about | at | — | eight, | before | the | heat.", "Early, around eight, before the heat.", { flags: { 3: ART_TIME } })],
    time_cafe: [t("Cuando | quiera. | Pero | en | la | mañana | el | pan | está | recién | hecho.", "When | you-want. | But | in | the | morning | the | bread | is | freshly | made.", "Anytime. But in the morning the bread is fresh out of the oven.", { spain: t("Cuando | quiera. | Pero | por | la | mañana | el | pan | está | recién | hecho.", "When | you-want. | But | in | the | morning | the | bread | is | freshly | made.", "Anytime. But in the morning the bread is fresh out of the oven.") })],
    time_trattoria: [t("Temprano, | como | a | las | siete, | o | va | a | tener | que | esperar | mesa.", "Early, | about | at | — | seven, | or | you're-going | to | have | to | wait | table.", "Early, around seven, or you'll have to wait for a table.", { flags: { 3: ART_TIME } })],
    time_any: [t("¡Cuando | quiera! | Pero | temprano | es | mejor.", "When | you-want! | But | early | is | better.", "Anytime! But earlier is better.")],
    price_muelle: [t("Como | trescientos | pesos | por | persona, | con | bebida.", "About | three hundred | pesos | per | person, | with | drink.", "About three hundred pesos a person, with a drink.")],
    price_trattoria: [t("Como | doscientos | pesos. | No está | mal.", "About | two hundred | pesos. | It's not | bad.", "About two hundred pesos. Not bad.")],
    price_taqueria: [t("¡Es | barato! | Con | cien | pesos | come | muy | bien.", "It's | cheap! | With | a hundred | pesos | you-eat | very | well.", "It's cheap! You can eat well for a hundred pesos.")],
    price_cocina: [t("Es | barato: | la | comida corrida | cuesta | como | cien | pesos.", "It's | cheap: | the | set lunch | costs | about | a hundred | pesos.", "It's cheap: the set lunch is about a hundred pesos.", { spain: t("Es | barato: | el | menú del día | cuesta | unos | cien | pesos.", "It's | cheap: | the | set lunch | costs | about | a hundred | pesos.", "It's cheap: the set lunch is about a hundred pesos.", {flags: {5: "unos before a number: about."}}) })],
    price_cafe: [t("Un | café | cuesta | como | cuarenta | y | cinco | pesos.", "A | coffee | costs | about | forty | and | five | pesos.", "A coffee is about forty-five pesos.")],
    price_cheap: [t("¡Es | baratito!", "It's | very cheap!", "It's really cheap!", { flags: { 1: "baratito: barato + -ito, “nice and cheap”." } })],
    price_free: [t("¡Es | gratis!", "It's | free!", "It's free!")],
    price_museo: [t("Ochenta | pesos, | creo. | Los | estudiantes | pagan | menos.", "Eighty | pesos, | I-think. | The | students | pay | less.", "Eighty pesos, I think. Students pay less.")],
    price_ruinas: [
      t("Se paga | entrada, | pero | no es | mucho. | Los | domingos | es | gratis | para | los | mexicanos | y | los | residentes.",
        "You pay | entrance, | but | it's not | much. | On | Sundays | it's | free | for | the | Mexicans | and | the | residents.",
        "There's an entrance fee, but it's not much. On Sundays it's free for Mexicans and residents.", { flags: { 5: "Los domingos: on Sundays (the article stands for “on”)." } }),
    ],
    price_cenote: [t("Se cobra | la | entrada; | depende | del | cenote. | Lleve | efectivo.", "They charge | the | entrance; | it-depends | on the | cenote. | Bring | cash.", "There's an entrance fee; it depends on the cenote. Bring cash.")],
    price_lancha: [t("No es | barato, | pero | vale la pena. | En | el | muelle | le | dan | precio.", "It's not | cheap, | but | it's worth it. | At | the | pier | (to) you | they-give | price.", "It's not cheap, but it's worth it. They'll give you a price at the pier.")],
    book_muelle: [t("Para | cenar, | sí. | Sobre todo | el | fin de semana.", "For | dinner, | yes. | Especially | on the | weekend.", "For dinner, yes. Especially on weekends.", { flags: { 4: "el fin de semana: on the weekend (the article stands for “on the”)." } })],
    // La Cocina de Lucía takes reservations, and walk-ins may wait in the evening (s73)
    book_trattoria: [t("Mejor | sí, | sobre todo | en | la | noche: | se llena.", "Better | yes, | especially | in | the | evening: | it-fills-up.", "I'd book, yes, especially in the evening: it fills up.", { spain: t("Mejor | sí, | sobre todo | por | la | noche: | se llena.", "Better | yes, | especially | in | the | evening: | it-fills-up.", "I'd book, yes, especially in the evening: it fills up.") })],
    book_lancha: [t("Sí, | mejor | un | día | antes, | en | el | muelle.", "Yes, | better | one | day | before, | at | the | pier.", "Yes, best to book the day before, at the pier.")],
    book_no: [t("No, | no hace falta. | Llegue | y ya.", "No, | there's no need. | Arrive | and that's it.", "No, no need. Just go.", { spain: t("No, | no hace falta. | Vaya | sin más.", "No, | there's no need. | Go | just like that.", "No, no need. Just go.") })],
    open_museo: [t("De | diez | a | cinco, | pero | los | lunes | está | cerrado.", "From | ten | to | five, | but | on | Mondays | it's | closed.", "Ten to five, but it's closed on Mondays.", { flags: { 5: "los lunes: on Mondays (the article stands for “on”)." } })],
    open_market: [
      t("Todos | los | días, | en | la | mañana, | hasta | como | las | dos. | El | sábado | hay | más | puestos.", "All | the | days, | in | the | morning, | until | about | — | two. | On | Saturday | there-are | more | stalls.",
        "Every morning, until about two. On Saturdays there are more stalls.", { flags: { 8: ART_TIME, 10: "El sábado: on Saturday (the article stands for “on”)." }, spain: t("Todos | los | días, | por | la | mañana, | hasta | como | las | dos. | El | sábado | hay | más | puestos.", "All | the | days, | in | the | morning, | until | about | — | two. | On | Saturday | there-are | more | stalls.", "Every morning, until about two. On Saturdays there are more stalls.", {flags: {8: "The article before a clock time has no English word.",10: "El sábado: on Saturday (the article stands for “on”)."}}) }),
    ],
    open_musica: [t("Todos | los | viernes, | a | las | ocho.", "All | the | Fridays, | at | — | eight.", "Every Friday, at eight.", { flags: { 4: ART_TIME } })],
    open_cocina: [t("Nada más | al | mediodía, | de | la | una | a | las | cinco.", "Only | at the | midday, | from | — | one | to | — | five.", "Only at lunchtime, from one to five.", { flags: { 4: ART_TIME, 7: ART_TIME }, spain: t("Solo | a | mediodía, | de | la | una | a | las | cinco.", "Only | at | midday, | from | — | one | to | — | five.", "Only at lunchtime, from one to five.", {flags: {4: "The article before a clock time has no English word.",7: "The article before a clock time has no English word."}}) })],
    open_cenote: [t("Abren | temprano, | como | a | las | ocho, | y | cierran | en | la | tarde.", "They-open | early, | about | at | — | eight, | and | they-close | in | the | afternoon.", "They open early, around eight, and close in the afternoon.", { flags: { 4: ART_TIME }, spain: t("Abren | temprano, | como | a | las | ocho, | y | cierran | por | la | tarde.", "They-open | early, | about | at | — | eight, | and | they-close | in | the | afternoon.", "They open early, around eight, and close in the afternoon.", {flags: {4: "The article before a clock time has no English word."}}) })],
    open_ruinas: [t("Todos | los | días, | desde | las | ocho | de la mañana.", "All | the | days, | from | — | eight | a.m.", "Every day, from eight in the morning.", { flags: { 4: ART_TIME } })],
    open_always: [t("¡Siempre | se puede | ir!", "Always | you can | go!", "You can go anytime!")],
    open_generic: [t("Abre | todos | los | días, | desde | temprano, | creo.", "It-opens | all | the | days, | from | early, | I-think.", "It's open every day from early on, I think.")],
    worth: [t("¡Claro que sí! | Le | va | a | encantar.", "Of course! | (To) you | it's going | to | delight.", "Absolutely! You'll love it.")],
    // "¿Qué tal es?", "¿Cómo es?", "¿Y el cenote?" about one of her tips
    like_it: [t("¡Le | va | a | encantar, | ya verá!", "(To) you | it's going | to | delight, | you'll see!", "You'll love it, you'll see!")],
    safe: [
      t("El | centro, | sí: | hay | gente | hasta | tarde. | Pero | la | playa | de | noche, | mejor | no: | está | oscura. | Y | no se meta | al | mar | de | noche.",
        "The | center, | yes: | there-are | people | until | late. | But | the | beach | at | night, | better | not: | it's | dark. | And | don't go | into the | sea | at | night.",
        "Downtown, yes: there are people around until late. But the beach at night, better not: it's dark. And don't go in the sea at night.", { spain: t("El | centro, | sí: | hay | gente | hasta | tarde. | Pero | la | playa | de | noche, | mejor | no: | está | oscura. | Y | no se meta | en | el | mar | de | noche.", "The | center, | yes: | there-are | people | until | late. | But | the | beach | at | night, | better | not: | it's | dark. | And | don't go | into | the | sea | at | night.", "Downtown, yes: there are people around until late. But the beach at night, better not: it's dark. And don't go in the sea at night.") }),
    ],
    no_walk_bus: [t("Entonces | tome | un | colectivo. | Pasan | por | la | avenida | cada rato.", "Then | take | a | shared van. | They-pass | along | the | avenue | every few minutes.", "Then take a colectivo. They come along the main road every few minutes.", { spain: t("Entonces | coja | un | colectivo. | Pasan | por | la | avenida | cada poco.", "Then | take | a | shared van. | They-pass | along | the | avenue | every few minutes.", "Then take a colectivo. They come along the main road every few minutes.") })],
    // the sitio is by the airport, at the far end of avenida Juárez: taxis are hailed on the avenue
    no_walk_taxi: [t("Entonces | tome | un | taxi: | pasan | muchos | por | la | avenida.", "Then | take | a | taxi: | pass | many | along | the | avenue.", "Then take a taxi: lots of them come along the avenue.", { spain: t("Entonces | coja | un | taxi: | pasan | muchos | por | la | avenida.", "Then | take | a | taxi: | pass | many | along | the | avenue.", "Then take a taxi: lots of them come along the avenue.") })],
    taxi_where: [t("Pasan | muchos | por | la | avenida: | nada más | levante | la | mano.", "Pass | many | along | the | avenue: | just | raise | the | hand.", "Lots of them come along the avenue: just wave one down.", { spain: t("Pasan | muchos | por | la | avenida: | solo | levante | la | mano.", "Pass | many | along | the | avenue: | just | raise | the | hand.", "Lots of them come along the avenue: just wave one down.") })],
    fare_colectivo: [t("No es | caro. | Le | paga | al | chofer | al bajarse, | en | efectivo.", "It's not | expensive. | (To) him | you-pay | to the | driver | when you get off, | in | cash.", "It's not expensive. You pay the driver when you get off, in cash.", { spain: t("No es | caro. | Le | paga | al | conductor | al bajarse, | en | efectivo.", "It's not | expensive. | (To) him | you-pay | to the | driver | when you get off, | in | cash.", "It's not expensive. You pay the driver when you get off, in cash.") })],
    fare_taxi: [t("El | taxi | cuesta | más. | Pregunte | el | precio | antes de | subirse.", "The | taxi | costs | more. | Ask | the | price | before | getting in.", "A taxi costs more. Ask the price before you get in.")],
    bus_yes: [t("Sí, | pasan | colectivos | por | la | avenida | cada rato.", "Yes, | pass | shared vans | along | the | avenue | every few minutes.", "Yes, colectivos come along the main road every few minutes.", { spain: t("Sí, | pasan | colectivos | por | la | avenida | cada poco.", "Yes, | pass | shared vans | along | the | avenue | every few minutes.", "Yes, colectivos come along the main road every few minutes.") })],
    bus_where: [t("Aquí | enfrente, | en | la | avenida | Juárez: | nada más | levante | la | mano.", "Here | opposite, | on | the | avenue | Juárez: | just | raise | the | hand.", "Right out front, on Juárez Avenue: just wave one down.", { spain: t("Aquí | enfrente, | en | la | avenida | Juárez: | solo | levante | la | mano.", "Here | opposite, | on | the | avenue | Juárez: | just | raise | the | hand.", "Right out front, on Juárez Avenue: just wave one down.") })],
    // places that aren't tips, from her bench (TOWN.md "From the zócalo's kiosco")
    where_banco: [t("Ahí | enfrente, | cruzando | la | avenida: | el | banco | amarillo | tiene | cajero.", "There | opposite, | crossing | the | avenue: | the | bank | yellow | has | an ATM.", "Right across the avenue: the yellow bank has an ATM.")],
    where_correos: [t("Ahí | enfrente, | cruzando | la | avenida, | junto | al | banco.", "There | opposite, | crossing | the | avenue, | next | to the | bank.", "Right across the avenue, next to the bank.")],
    where_iglesia: [t("Ahí, | al | final | de | la | plaza, | enfrente | del | kiosco.", "There, | at the | end | of | the | square, | opposite | of the | bandstand.", "Right there, at the end of the square, facing the bandstand.")],
    where_policia: [t("Al | final | de | la | plaza, | junto | a | la | iglesia, | en | la | esquina.", "At the | end | of | the | square, | next | to | the | church, | on | the | corner.", "At the end of the square, next to the church, on the corner.")],
    where_mercado: [t("Por | la | avenida | del | Puerto, | para | allá, | pasando | el | museo: | a | dos | minutos.", "Along | the | avenue | of the | Harbor, | toward | there, | passing | the | museum: | at | two | minutes.",
      "Along Avenida del Puerto, that way, past the museum: two minutes from here.")],
    where_turismo: [t("En | la | avenida | Juárez, | para | allá, | pasando | el | museo.", "On | the | avenue | Juárez, | toward | there, | passing | the | museum.", "On Juárez Avenue, that way, past the museum.")],
    where_west: [t("En | la | avenida | Juárez, | a | dos | cuadras, | por | allá, | pasando | la | calle | Flamboyán.", "On | the | avenue | Juárez, | at | two | blocks, | over | there, | passing | the | street | Flamboyán.",
      "On Juárez Avenue, two blocks that way, past Flamboyán Street.", { spain: t("En | la | avenida | Juárez, | a | dos | calles, | por | allá, | pasando | la | calle | Flamboyán.", "On | the | avenue | Juárez, | at | two | streets, | over | there, | passing | the | street | Flamboyán.", "On Juárez Avenue, two blocks that way, past Flamboyán Street.") })],
    where_other: [t("Mejor | pregunte | en | Información Turística, | aquí | en | la | avenida | Juárez: | ahí | le | dan | un | mapa.", "Better | ask | at | Tourist Information, | here | on | the | avenue | Juárez: | there | (to) you | they-give | a | map.",
      "Better ask at the tourist information office, right here on Juárez Avenue: they'll give you a map.")],
    her_name: [t("¡Carmen, | para servirle!", "Carmen, | at your service!", "Carmen, at your service!")],
    which_spot: [t("¿De | cuál | me | habla, | {m:mijo|f:mija}?", "About | which | (to) me | you-speak, | dear?", "Which place do you mean, dear?", { flags: { 4: MIJA }, spain: t("¿De | cuál | me | habla, | {m:hijo|f:hija}?", "About | which | (to) me | you-speak, | dear?", "Which place do you mean, dear?") })],
    no_problem: [t("Ah, | ¡está bien!", "Oh, | okay!", "Oh, okay!")],
    help_sure: [t("¡Claro, | {m:mijo|f:mija}! | ¿Qué | necesita?", "Sure, | dear! | What | you-need?", "Of course, dear! What do you need?", { flags: { 1: MIJA }, spain: t("¡Claro, | {m:hijo|f:hija}! | ¿Qué | necesita?", "Sure, | dear! | What | you-need?", "Of course, dear! What do you need?") })],

    // --- small talk and twists -------------------------------------------------------
    ask_from: [t("Y | usted, | ¿de | dónde | es?", "And | you, | from | where | are-you?", "So where are you from?")],
    from_far: [t("¡Uy, | de | muy | lejos! | Bienvenid{m:o|f:a} | a | Puerto | Colibrí.", "Wow, | from | very | far! | Welcome | to | Puerto | Colibrí.", "Wow, all that way! Welcome to Puerto Colibrí.")],
    from_canada: [t("¡De | Canadá! | Aquí | vienen | muchos | canadienses | en | el | invierno.", "From | Canada! | Here | come | many | Canadians | in | the | winter.", "Canada! Lots of Canadians come here in the winter.")],
    from_other: [
      t("¡Ay, | qué | padre! | Bienvenid{m:o|f:a} | a | Puerto | Colibrí.", "Oh, | how | cool! | Welcome | to | Puerto | Colibrí.", "Oh, how nice! Welcome to Puerto Colibrí.",
        { flags: { 2: "Mexican: padre = cool, great." }, neutral: t("¡Ay, | qué | bien! | Bienvenid{m:o|f:a} | a | Puerto | Colibrí.", "Oh, | how | nice! | Welcome | to | Puerto | Colibrí.", "Oh, how nice! Welcome to Puerto Colibrí.") }),
    ],
    walk_offer: [
      t("¿Sabe | qué? | Yo | voy | para | allá. | ¿Quiere | que | {m:lo|f:la} | acompañe?", "You-know | what? | I | go | toward | there. | You-want | that | you | I-accompany?",
        "You know what? I'm going that way myself. Would you like me to walk with you?", { flags: { 8: LOLA } }),
    ],
    walk_yes: [
      t("¡Ándele, | vámonos! | Me gusta | caminar.", "Come on, | let's go! | I like | to walk.", "Wonderful, let's go! I love a good walk.",
        { flags: { 0: "Mexican: ándele = come on, all right." }, neutral: t("¡Muy | bien, | vámonos! | Me gusta | caminar.", "Very | good, | let's go! | I like | to walk.", "Wonderful, let's go! I love a good walk."), spain: t("¡Muy | bien, | vámonos! | Me gusta | andar.", "Very | good, | let's go! | I like | to walk.", "Wonderful, let's go! I love a good walk.") }),
    ],
    walk_no: [t("¡Sin problema, | {m:mijo|f:mija}!", "No problem, | dear!", "No problem, dear!", { flags: { 1: MIJA }, spain: t("¡Sin problema, | {m:hijo|f:hija}!", "No problem, | dear!", "No problem, dear!") })],
    market_seller: [t("Ay, | yo | no vendo | nada, | {m:mijo|f:mija}. | Los | puestos | están | aquí | atrás.", "Oh, | I | don't sell | anything, | dear. | The | stalls | are | here | behind.", "Oh, I don't sell anything, dear! The stalls are right behind me.", { flags: { 4: MIJA }, spain: t("Ay, | yo | no vendo | nada, | {m:hijo|f:hija}. | Los | puestos | están | aquí | atrás.", "Oh, | I | don't sell | anything, | dear. | The | stalls | are | here | behind.", "Oh, I don't sell anything, dear! The stalls are right behind me.") })],
    market_where: [t("¡Aquí | mismo! | Los | puestos | están | aquí | atrás.", "Here | right! | The | stalls | are | here | behind.", "Right here! The stalls are right behind me.")],
    market_tip: [t("Pruebe | la | papaya: | aquí | es | bien | dulce.", "Try | the | papaya: | here | it's | very | sweet.", "Try the papaya: it's really sweet here.", { flags: { 5: "bien before an adjective: “very”." }, spain: t("Pruebe | la | papaya: | aquí | es | muy | dulce.", "Try | the | papaya: | here | it's | very | sweet.", "Try the papaya: it's really sweet here.") })],

    // --- the end ------------------------------------------------------------------------
    prompt_sight: [t("Y | ya que | está | aquí, | ¿quiere | conocer | algo?", "And | since | you're | here, | you-want | to see | something?", "And while you're here, is there anything you'd like to see?")],
    nudge_sight: [t("Bueno, | no se vaya | sin | ver | esto:", "Well, | don't leave | without | seeing | this:", "Well, don't leave without seeing this:")],
    sight_again: [t("¿Y | quiere | conocer | algún | lugar?", "And | you-want | to see | some | place?", "And is there anywhere you'd like to see?")],
    food_again: [t("¿Y | para | comer? | ¿Tiene | hambre?", "And | for | eating? | You-have | hunger?", "And what about food? Are you hungry?")],
    prompt_food: [t("¿Y | tiene | hambre? | Yo | conozco | todos | los | lugares | buenos | para | comer.", "And | you-have | hunger? | I | know | all | the | places | good | for | eating.", "And are you hungry? I know all the good places to eat.")],
    ask_more: [
      t("¿Algo | más, | {m:mijo|f:mija}?", "Something | more, | dear?", "Anything else, dear?", { flags: { 2: MIJA }, spain: t("¿Algo | más, | {m:hijo|f:hija}?", "Something | more, | dear?", "Anything else, dear?") }),
      t("¿Le | ayudo | en | algo | más?", "(To) you | I-help | in | something | more?", "Can I help you with anything else?"),
    ],
    thanks_reply: [
      t("¡Con mucho gusto!", "With great pleasure!", "My pleasure!"),
      t("¡Para | eso | estamos! | Y | hábleles | de | Puerto | Colibrí | a | sus | amigos.", "For | that | we-are! | And | tell-them | about | Puerto | Colibrí | — | your | friends.", "Anytime! And tell your friends about Puerto Colibrí!", { flags: { 8: A_TELL } }),
    ],
    closing: [
      t("¡Disfrute | mucho | Puerto | Colibrí! | Aquí | me | encuentra, | en | la | plaza.", "Enjoy | a lot | Puerto | Colibrí! | Here | me | you-find, | in | the | square.", "Enjoy Puerto Colibrí! You'll find me right here in the square."),
    ],
  },

  hints: {
    local: {
      lt: "Start a chat with a local",
      items: [
        { id: "l_from", s: t("Disculpe, | ¿es | usted | de | aquí?", "Excuse me, | are | you | from | here?", "Excuse me, are you from around here?"), note: "A polite way to start talking to a stranger." },
        { id: "l_live", s: t("¿Vive | aquí?", "You-live | here?", "Do you live here?") },
        { id: "l_local", s: t("¿Conoce | bien | el | pueblo?", "You-know | well | the | town?", "Do you know the town well?") },
      ],
    },
    ask_general: {
      lt: "Ask for a recommendation",
      items: [
        { id: "r_what", s: t("¿Qué | me | recomienda?", "What | (to) me | you-recommend?", "What would you recommend?") },
        { id: "r_tips", s: t("¿Tiene | alguna | recomendación?", "You-have | any | recommendation?", "Do you have any tips?") },
      ],
    },
    food: {
      lt: "Ask where to eat", slot: "cuisine", examples: ["mariscos", "yucateca", "tacos"],
      items: [
        { id: "f_recommend", s: t("¿Me | puede | recomendar | un | buen | lugar | para | comer?", "(To) me | can you | recommend | a | good | place | for | eating?", "Can you recommend a good place to eat?") },
        { id: "f_where_good", s: t("¿Dónde | se come | bien | por | aquí?", "Where | does one eat | well | around | here?", "Where's a good place to eat around here?") },
        { id: "f_cheap", s: t("Busco | un | lugar | para | comer | que | no sea | muy | caro.", "I'm looking for | a | place | for | eating | that | isn't | very | expensive.", "I'm looking for somewhere to eat that's not too expensive.") },
        { id: "f_locals", s: t("¿Dónde | come | la | gente | de | aquí?", "Where | eats | the | people | from | here?", "Where do the locals eat?"), note: "Mexicans say “la gente de aquí” for locals." },
        { id: "f_cuisine", s: t("¿Dónde | puedo | comer | {X}?", "Where | I-can | eat | {X}?", "Where can I get {X}?"), only: (e) => !["cafe", "desayuno"].includes(e.id) },
        { id: "f_cuisine_place", s: t("¿Hay | un | buen | lugar | de | {X} | por | aquí?", "Is there | a | good | place | of | {X} | around | here?", "Is there a good {X} place around here?"), only: (e) => ["mariscos", "tacos", "yucateca"].includes(e.id) },
        { id: "f_lunch", s: t("¿Qué | me | recomienda | para | cenar?", "What | (to) me | you-recommend | for | having dinner?", "What would you recommend for dinner?") },
      ],
    },
    cuisine: {
      lt: "Say what you feel like", slot: "cuisine", examples: ["mariscos", "yucateca", "tacos"],
      items: [
        { id: "k_cuisine", s: t("{X}, | por favor.", "{X}, | please.", "{X}, please.") },
        { id: "k_want", s: t("Quiero | probar | {X}.", "I want | to try | {X}.", "I'd like to try {X}."), only: (e) => ["mariscos", "yucateca", "tacos"].includes(e.id) },
        { id: "k_cheap", s: t("Algo | barato, | por favor.", "Something | cheap, | please.", "Something cheap, please.") },
        { id: "k_anything", s: t("Lo que | usted | me | recomiende.", "What | you | (to) me | recommend.", "Whatever you recommend.") },
        { id: "k_not", s: t("No como | {X}.", "I don't eat | {X}.", "I don't eat {X}."), only: (e) => e.id === "mariscos" },
      ],
    },
    sight: {
      lt: "Ask what to see",
      items: [
        { id: "s_worth", s: t("¿Qué | vale la pena | ver | aquí?", "What | is worth it | to see | here?", "What's worth seeing here?") },
        { id: "s_miss", s: t("¿Qué | no me puedo | perder?", "What | can't I | miss?", "What shouldn't I miss?") },
        { id: "s_anything", s: t("¿Hay | algo | interesante | que | ver?", "Is there | something | interesting | to | see?", "Is there anything interesting to see?") },
        { id: "s_recommend", s: t("¿Qué | me | recomienda | visitar?", "What | (to) me | you-recommend | to visit?", "What would you recommend I visit?") },
        { id: "s_favorite", s: t("¿Cuál | es | su | lugar | favorito?", "Which | is | your | place | favorite?", "What's your favorite place?") },
      ],
    },
    follow: {
      lt: "Ask about the place",
      items: [
        { id: "u_far", s: t("¿Está | lejos?", "Is it | far?", "Is it far?") },
        { id: "u_walk", s: t("¿Se puede | ir | caminando?", "Can you | go | walking?", "Can you walk there?", { spain: t("¿Se puede | ir | andando?", "Can you | go | walking?", "Can you walk there?") }) },
        { id: "u_how", s: t("¿Cómo | llego?", "How | I-get-there?", "How do I get there?") },
        { id: "u_touristy", s: t("¿Hay | muchos | turistas?", "Are there | many | tourists?", "Is it touristy?") },
        { id: "u_time", s: t("¿A | qué | hora | es | mejor | ir?", "At | what | time | is | better | to go?", "What's the best time to go?") },
        { id: "u_expensive", s: t("¿Es | caro?", "Is it | expensive?", "Is it expensive?") },
        { id: "u_cost", s: t("¿Cuánto | cuesta | la | entrada?", "How much | costs | the | entrance?", "How much is it to get in?") },
        { id: "u_book", s: t("¿Hay que | reservar?", "Do I need | to book?", "Do I need to book?") },
        { id: "u_open", s: t("¿Está | abierto | hoy?", "Is it | open | today?", "Is it open today?") },
        { id: "u_safe", s: t("¿Es | seguro | de | noche?", "Is it | safe | at | night?", "Is it safe at night?") },
      ],
    },
    night: {
      lt: "Ask about evenings and coffee",
      items: [
        { id: "n_night", s: t("¿Qué | se puede | hacer | en | la | noche?", "What | can you | do | in | the | evening?", "What is there to do at night?", { spain: t("¿Qué | se puede | hacer | por | la | noche?", "What | can you | do | in | the | evening?", "What is there to do at night?") }) },
        { id: "c_best_coffee", s: t("¿Dónde | está | el | mejor | café?", "Where | is | the | best | coffee?", "Where's the best coffee in town?") },
      ],
    },
    thanks: {
      lt: "Thank her for the tips",
      items: [
        { id: "t_all", s: t("No, | es | todo. | ¡Gracias | por | los | consejos!", "No, | it's | all. | Thanks | for | the | tips!", "No, that's all. Thanks for the tips!") },
        { id: "t_tip", s: t("¡Gracias | por | la | recomendación!", "Thanks | for | the | recommendation!", "Thanks for the tip!") },
        { id: "t_helpful", s: t("¡Me | ayudó | mucho!", "(To) me | you-helped | a lot!", "You've been really helpful!", { spain: t("¡Me | ha ayudado | mucho!", "(To) me | you've-helped | a lot!", "You've been really helpful!") }) },
        { id: "t_sounds", s: t("¡Suena | muy | bien!", "It-sounds | very | good!", "That sounds great!") },
        { id: "t_check", s: t("¡Voy | a | ir!", "I'm going | to | go!", "I'll check it out!") },
      ],
    },
    hungry: {
      lt: "Say you'd like to eat",
      items: [
        { id: "hg_hungry", s: t("Sí, | tengo | hambre.", "Yes, | I-have | hunger.", "Yes, I'm hungry.") },
        { id: "hg_where", s: t("¡Sí! | ¿Dónde | puedo | comer?", "Yes! | Where | I-can | eat?", "Yes! Where should I eat?") },
        { id: "hg_recommend", s: t("Sí, | ¿qué | me | recomienda?", "Yes, | what | (to) me | you-recommend?", "Yes, what would you recommend?") },
      ],
    },
    weather: {
      lt: "Agree it's a lovely day",
      items: [
        { id: "wt_day", s: t("Sí, | ¡qué | día | tan | bonito!", "Yes, | what | a day | so | beautiful!", "Yes, what a beautiful day!") },
        { id: "wt_hot", s: t("Sí, | ¡y | qué | calor!", "Yes, | and | what | heat!", "Yes, and it's so hot!") },
      ],
    },
    tried: {
      lt: "Say whether you tried it",
      items: [
        { id: "tr_delicious", s: t("¡Sí, | estuvo | delicioso!", "Yes, | it-was | delicious!", "Yes, it was delicious!") },
        { id: "tr_not_yet", s: t("Todavía | no.", "Still | not.", "Not yet.") },
        { id: "tr_great", s: t("Sí, | ¡me | encantó!", "Yes, | (to) me | it-delighted!", "Yes, I loved it!") },
      ],
    },
    kind: {
      lt: "Say: something to eat or something to see",
      items: [
        { id: "kd_food", s: t("Para | comer.", "For | eating.", "Somewhere to eat.") },
        { id: "kd_see", s: t("Algo | que | ver.", "Something | to | see.", "Something to see.") },
        { id: "kd_both", s: t("¡Las | dos | cosas!", "The | two | things!", "Both!") },
      ],
    },
    from: {
      lt: "Say where you're from", slot: "country", examples: ["usa", "canada", "uk"],
      items: [
        { id: "o_from", s: t("Soy | de | {X}.", "I'm | from | {X}.", "I'm from {X}.") },
        { id: "o_come", s: t("Vengo | de | {X}.", "I-come | from | {X}.", "I'm from {X}.") },
      ],
    },
    walk: {
      lt: "Accept the offer, or politely say no",
      items: [
        { id: "w_yes", s: t("¡Me | encantaría, | gracias!", "(To) me | it-would-delight, | thanks!", "That would be great, thanks!") },
        { id: "w_kind", s: t("¡Qué | amable!", "How | kind!", "That's so kind of you!") },
        { id: "w_no", s: t("No se preocupe, | llego | {m:solo|f:sola}.", "Don't worry, | I-get-there | alone.", "Don't worry, I'll find my way.") },
      ],
    },
    spots: {
      lt: "Ask about a place", slot: "spot", examples: ["cenote", "lancha", "museo"],
      items: [
        { id: "p_worth", s: t("¿Vale la pena | {X.the}?", "Is it worth it | {X.the}?", "Is {X.the} worth it?"), only: notPl },
        { id: "p_far", s: t("¿Está | lejos | {X.the}?", "Is | far | {X.the}?", "Is {X.the} far from here?"), only: notPl },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With an older stranger, usted is more polite: “¿Es usted de aquí?”, “¿Qué me recomienda?” (tú is for friends).", better: "¿Qué me recomienda?" },
  },

  merges: {
    // Spain's twins (11 Nov 2026)
    "ha cenado": { reason: "grammatical_fusion", split: "ha → have/has + cenado (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "ha ido": { reason: "grammatical_fusion", split: "ha → have/has + ido (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "ha probado": { reason: "grammatical_fusion", split: "ha → have/has + probado (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "le apetece": { reason: "grammatical_fusion", split: "le → to you + apetece → appeals: Spain's ¿qué le apetece? = what do you feel like?", minimal: "Clitic and verb." },
    "sin más": { reason: "lexical_expression", split: "sin → without + más → more: = just like that.", minimal: "Two words." },
    "menú del día": { reason: "lexical_expression", split: "menú → menu + del → of the + día → day: = the set lunch.", minimal: "Three words." },
    "cada poco": { reason: "lexical_expression", split: "cada → each + poco → little: = every few minutes (Spain).", minimal: "Two words." },
    "ha ayudado": { reason: "grammatical_fusion", split: "ha → have/has + ayudado (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "la cocina de lucía": { reason: "lexical_expression", split: "la → the + cocina → kitchen + de → of + Lucía would translate the restaurant's proper name.", minimal: "The four-word name." },
    "poc chuc": { reason: "lexical_expression", split: "Two Maya words (toast + charcoal); one dish name.", minimal: "Two-word dish name." },
    "el muelle": { reason: "lexical_expression", split: "el → the + muelle → pier would translate the restaurant's proper name.", minimal: "Two-word name." },
    "la ceiba": { reason: "lexical_expression", split: "la → the + ceiba → ceiba tree would translate the café's proper name.", minimal: "Two-word name." },
    "cocina económica": { reason: "lexical_expression", split: "cocina → kitchen + económica → cheap misreads the kind of place: a home-style diner.", minimal: "Two words." },
    "comida corrida": { reason: "lexical_expression", split: "comida → food + corrida → run is false; = the set lunch.", minimal: "Two words." },
    "a la talla": { reason: "lexical_expression", split: "a → to + la → the + talla → size is false; = split and grilled (a dish name).", minimal: "Three words." },
    "enfrente de": { reason: "lexical_expression", split: "enfrente → in front + de → of misreads the preposition: across from.", minimal: "Two words." },
    "información turística": { reason: "lexical_expression", split: "información → information + turística → tourist would translate the office's name (the visitor center).", minimal: "Two-word name." },
    "ya verá": { reason: "lexical_expression", split: "ya → already + verá → you will see is false; = you'll see.", minimal: "Two words." },
    "para servirle": { reason: "lexical_expression", split: "para → for + servirle → serving you; the courtesy formula = at your service.", minimal: "Two words." },
    "eso sí": { reason: "lexical_expression", split: "eso → that + sí → yes is false; the concession = mind you.", minimal: "Two words." },
    "queso de bola": { reason: "lexical_expression", split: "queso → cheese + de → of + bola → ball is a calque; = Edam cheese.", minimal: "Three words." },
    "se le ofrece": { reason: "grammatical_fusion", split: "se → itself + le → to you + ofrece → offers; the service question = what can I do for you.", minimal: "Three words." },
    "se le antoja": { reason: "grammatical_fusion", split: "se → itself + le → to you + antoja → craves; = do you feel like.", minimal: "Three words." },
    "de toda la vida": { reason: "lexical_expression", split: "de → of + toda → all + la → the + vida → life; = all my life.", minimal: "Four words." },
    "sin duda": { reason: "lexical_expression", split: "sin → without + duda → doubt; = no question, definitely.", minimal: "Two words." },
    "al bajarse": { reason: "grammatical_fusion", split: "al → to the + bajarse → get off is false; al + infinitive = when you…", minimal: "Two words." },
    "antes de que": { reason: "lexical_expression", split: "antes → before + de → of + que → that; one conjunction = before.", minimal: "Three words." },
    "entre semana": { reason: "lexical_expression", split: "entre → between + semana → week is false; = on weekdays.", minimal: "Two words." },
    "antes de": { reason: "lexical_expression", split: "antes → before + de → of; one preposition = before.", minimal: "Two words." },
    "después de": { reason: "lexical_expression", split: "después → afterwards + de → of; one preposition = after.", minimal: "Two words." },
    "sobre todo": { reason: "lexical_expression", split: "sobre → on + todo → all is false; = especially.", minimal: "Two words." },
    "fin de semana": { reason: "lexical_expression", split: "fin → end + de → of + semana → week; = weekend.", minimal: "Three words." },
    "y ya": { reason: "lexical_expression", split: "y → and + ya → already is false; = and that's it.", minimal: "Two words." },
    "no hace falta": { reason: "lexical_expression", split: "no → not + hace → makes + falta → lack; = there's no need.", minimal: "Three words." },
    "vale la pena": { reason: "lexical_expression", split: "vale → is worth + la → the + pena → sorrow is false; = it's worth it.", minimal: "Three words." },
    "cada rato": { reason: "lexical_expression", split: "cada → each + rato → while is unidiomatic; = every few minutes.", minimal: "Two words." },
    "ya que": { reason: "lexical_expression", split: "ya → already + que → that is false; = since.", minimal: "Two words." },
    "con mucho gusto": { reason: "lexical_expression", split: "con → with + mucho → much + gusto → taste; = my pleasure.", minimal: "Three words." },
    "en vivo": { reason: "lexical_expression", split: "en → in + vivo → alive is false; = live (music).", minimal: "Two words." },
    "hay que": { reason: "grammatical_fusion", split: "hay → there is + que → that is false; impersonal obligation = you have to / do I need to.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Ask where to eat", done: (c) => !!c.s.foodRec || !!c.s.wantFood },
    { step: "food_kind", lt: "Say what kind of food you'd like", optional: true },
    { lt: "Say where you're from", optional: true, when: (c) => conv(c).pending?.id === "from", done: (c) => !!c.s.fromAnswered },
    { lt: "Ask what's worth seeing", done: (c) => !!c.s.sightRec },
    { step: "more", lt: "Thank her for the tips" },
  ],
  steps: [
    // until there is a tip to follow up: a first question about something else ("¿Es seguro de noche?") gets its
    // answer, then "¿Busca dónde comer, o algo que ver?"
    { id: "need", done: (c) => !!(c.s.foodRec || c.s.sightRec || c.s.wantFood),
      ask: (c) => { c.s.needAsks = (c.s.needAsks || 0) + 1; if (c.s.needAsks > 1) { c.say(c.s.needAsks % 2 ? "ask_need_short" : "ask_need_again"); expectKind(c); } else c.say("ask_need"); },
      expects: ["are_you_local", "ask_food", "ask_sight", "recommend_vague", "ask_coffee", "ask_night", "ask_locals"],
      suggest: [
        { lt: "Ask where to eat", hint: "food", options: "cuisine" },
        { lt: "Ask what's worth seeing", hint: "sight" },
        { lt: "Ask if she's from here", hint: "local" },
        { lt: "Ask for a recommendation", hint: "ask_general" },
      ],
      help: (c) => { c.say("ask_need_again"); } },
    { id: "food_kind", when: (c) => !!c.s.wantFood && !c.s.foodRec, done: () => false,
      ask: (c) => c.say("ask_cuisine"),
      expects: ["food_ans", "food_neg", "budget"],
      suggest: [{ lt: "Say what you feel like", hint: "cuisine", options: "cuisine" }, { lt: "Ask for somewhere cheap", hint: "food" }],
      // a bare "No, gracias" / "Sí" to "¿Qué se le antoja?": she picks for them (never the same question again)
      yes: (c) => { c.say("then_try"); recFood(c, undefined, !!c.s.cheap, false, true); },
      no: (c) => { c.say("then_try"); recFood(c, undefined, !!c.s.cheap, false, true); },
      help: (c) => { recFood(c, undefined, !!c.s.cheap, false, true); } },
    // She asks once; if the learner talks about something else, she lets it go (an optional question).
    { id: "from", when: (c) => c.s.askFrom && !!(c.s.foodRec || c.s.sightRec) && !(c.s.foodRec && c.s.sightRec), done: (c) => !!c.s.fromDone,
      ask: (c) => {
        c.s.fromDone = true;
        c.say("ask_from");
        c.expect({ id: "from", optional: true, expects: ["from_ctx"], hints: ["from"], suggest: [{ lt: "Say where you're from", hint: "from", options: "country" }] });
      },
      expects: ["from_ctx"],
      suggest: [{ lt: "Say where you're from", hint: "from", options: "country" }] },
    { id: "sight", when: (c) => !!c.s.foodRec && !c.s.sightRec, done: (c) => !!c.s.sightRec,
      ask: (c) => { c.s.sightAsks = (c.s.sightAsks || 0) + 1; if (c.s.sightAsks === 2) { c.say("sight_again"); return; } if (c.s.sightAsks > 2) { c.say("nudge_sight"); recommend(c, sightFor(c, []), true); thenNext(c); return; } c.say("prompt_sight"); },
      expects: ["ask_sight", "recommend_vague", "spot_ctx"],
      suggest: [{ lt: "Ask what's worth seeing", hint: "sight" }, { lt: "Ask about the place", hint: "follow" }],
      yes: (c) => { recommend(c, c.s.sightRec ? anotherSight(c) : sightFor(c, [])); },
      no: (c) => { if (c.s.sightRec) { c.say("no_problem"); return; } c.say("nudge_sight"); recommend(c, sightFor(c, [])); } },
    { id: "food", when: (c) => !!c.s.sightRec && !c.s.foodRec && !c.s.wantFood, done: (c) => !!c.s.foodRec || !!c.s.wantFood,
      ask: (c) => { c.s.foodAsks = (c.s.foodAsks || 0) + 1; if (c.s.foodAsks === 2) { c.say("food_again"); return; } if (c.s.foodAsks > 2) { c.say("later_food"); recFood(c, undefined, !!c.s.cheap, false, true); thenNext(c); return; } c.say("prompt_food"); },
      expects: ["ask_food", "food_ans", "not_hungry", "hungry_ctx"],
      suggest: [{ lt: "Say you'd like to eat", hint: "hungry" }, { lt: "Ask where to eat", hint: "food", options: "cuisine" }, { lt: "Answer yes or no", hint: "g_yesno" }],
      yes: (c) => { if (!c.s.foodRec) c.s.wantFood = true; else c.say("no_problem"); },
      no: (c) => { if (c.s.foodRec) { c.say("no_problem"); return; } c.say("later_food"); recFood(c, undefined, !!c.s.cheap); } },
    { id: "walk", when: (c) => c.s.walkTwist && !!c.s.foodRec && !!c.s.sightRec, done: (c) => !!c.s.walkDone,
      ask: (c) => { c.s.walkDone = true; c.twist("walk_with_you"); c.say("walk_offer");
        c.expect({ id: "walk", optional: true, expects: ["walk_yes_ctx", "walk_no_ctx"], hints: ["walk"], suggest: [{ lt: "Accept the offer, or politely say no", hint: "walk" }],
          yes: (cc) => { cc.s.walkAnswered = true; cc.say("walk_yes"); cc.event("follow", { npc: "rosa", to: cc.s.topic }); },
          no: (cc) => { cc.s.walkAnswered = true; cc.say("walk_no"); } }); } },
    { id: "more", when: (c) => !!c.s.foodRec && !!c.s.sightRec, done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("ask_more"),
      expects: ["more_no", "thanks_tip"],
      suggest: [{ lt: "Thank her for the tips", hint: "thanks" }, { lt: "Ask about the place", hint: "follow" }, { lt: "Ask about evenings and coffee", hint: "night" }],
      yes: (c) => { c.say("help_sure"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.recs = [];
    c.s.avoid = [];
    c.s.avoidSight = [];
    c.s.foodDefault = c.pick(["cocina", "muelle"]);
    c.s.sightDefault = c.visits >= 1 ? c.pick(["cenote", "ruinas"]) : "cenote";
    c.s.askFrom = c.chance(0.5);
    c.s.walkTwist = c.visits >= 1 && c.chance(0.5);
    const last = c.memory.lastTip as string | undefined;
    c.s.triedTip = c.visits >= 1 && last && TRIED[last] && c.chance(0.6) ? last : undefined;
    c.s.weatherOpen = !c.s.triedTip && c.chance(0.3);
  },

  start: (c) => {
    const last = c.s.triedTip as string | undefined;
    if (last && TRIED[last]) {
      c.say("tried_hello");
      c.say(`tried_${last}`);
      c.twist("tried_tip");
      const yes = (cc: Ctx) => { cc.say("tried_yes"); cc.say("ask_need"); cc.hold(); };
      const no = (cc: Ctx) => { cc.say("tried_no"); cc.say("ask_need"); cc.hold(); };
      c.expect({ id: "tried", optional: true, expects: ["tried_yes_ctx", "tried_no_ctx"], hints: ["tried"], suggest: [{ lt: "Say whether you tried it", hint: "tried" }],
        yes, no, on: { tried_yes_ctx: (cc) => { yes(cc); }, tried_no_ctx: (cc) => { no(cc); } } });
      return;
    }
    if (c.s.weatherOpen) {
      c.say("open_weather");
      c.expect({ id: "weather", optional: true, expects: ["weather_ok"], hints: ["weather"], suggest: [{ lt: "Agree it's a lovely day", hint: "weather" }, { lt: "Ask where to eat", hint: "food", options: "cuisine" }],
        yes: (cc) => { cc.say("weather_reply"); cc.hold(); }, no: (cc) => { cc.say("ask_need"); cc.hold(); },
        on: { weather_ok: (cc, _sl, sg) => { cc.say(sg.tags.includes("hot") ? "weather_hot" : "weather_reply"); cc.hold(); } } });
      return;
    }
    c.say("open");
    c.hold();
  },

  handlers: wrap(H),

  finish: (c) => {
    c.complete();
    c.say("closing");
    c.expect({ id: "closing", hints: ["g_social", "thanks"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("thanks_reply"); cc.end(); },
        thanks_tip: (cc) => { cc.say("thanks_reply"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // the stalls behind her bench: buying fruit gets a friendly pointer, never "I didn't understand"
    { say: "Quiero comprar fruta", intent: "buy_produce" },
    { say: "¿Dónde puedo comprar mangos?", intent: "buy_produce" },
    { say: "¿Cuánto cuestan los mangos?", intent: "buy_produce", not: ["ask_price"] },
    { say: "Disculpe, ¿es usted de aquí?", intent: "are_you_local" },
    { say: "¿Vive aquí?", intent: "are_you_local" },
    { say: "¿Conoce bien el pueblo?", intent: "are_you_local" },
    { say: "¿Eres de aquí?", intent: "are_you_local" },
    { say: "¿Qué me recomienda?", intent: "recommend_vague" },
    { say: "¿Tiene alguna recomendación?", intent: "recommend_vague" },
    { say: "¿Me puede recomendar un buen lugar para comer?", intent: "ask_food" },
    { say: "¿Dónde se come bien por aquí?", intent: "ask_food" },
    { say: "Busco un lugar para comer que no sea muy caro.", intent: "ask_food" },
    { say: "¿Dónde come la gente de aquí?", intent: "ask_locals" },
    { say: "¿Dónde puedo comer mariscos?", intent: "ask_food", slots: { cuisine: "mariscos" } },
    { say: "¿Hay un buen lugar de comida yucateca por aquí?", intent: "ask_food", slots: { cuisine: "yucateca" } },
    { say: "¿Qué me recomienda para cenar?", intent: "ask_food" },
    { say: "¿Dónde venden cochinita pibil?", intent: "ask_food", slots: { cuisine: "yucateca" } },
    { say: "Mariscos, por favor", intent: "food_ans", step: "food_kind", slots: { cuisine: "mariscos" } },
    { say: "Quiero probar comida yucateca", intent: "food_ans", step: "food_kind", slots: { cuisine: "yucateca" } },
    { say: "Algo barato, por favor", intent: "budget", step: "food_kind" },
    { say: "Lo que usted me recomiende", intent: "food_ans", step: "food_kind" },
    { say: "Se me antojan unos tacos", intent: "food_ans", step: "food_kind", slots: { cuisine: "tacos" } },
    { say: "No como mariscos", intent: "food_neg", step: "food_kind", not: ["food_ans"] },
    { say: "Sin pescado, por favor", intent: "food_neg", step: "food_kind", not: ["food_ans"] },
    { say: "Es muy caro para mí", intent: "too_expensive" },
    { say: "¿Hay algo más barato?", intent: "too_expensive" },
    { say: "No tengo hambre", intent: "not_hungry", not: ["ask_food"] },
    { say: "¿Qué vale la pena ver aquí?", intent: "ask_sight" },
    { say: "¿Qué no me puedo perder?", intent: "ask_sight" },
    { say: "¿Hay algo interesante que ver?", intent: "ask_sight" },
    { say: "¿Qué me recomienda visitar?", intent: "ask_sight" },
    { say: "¿Cuál es su lugar favorito?", intent: "ask_favorite" },
    { say: "Me encanta la naturaleza", intent: "ask_sight" },
    { say: "¿Se puede ir caminando?", intent: "ask_walk" },
    { say: "¿Cómo llego al cenote?", intent: "ask_walk", slots: { spot: "cenote" } },
    { say: "¿Hay muchos turistas?", intent: "ask_touristy" },
    { say: "¿A qué hora es mejor ir?", intent: "ask_best_time" },
    { say: "¿Es caro?", intent: "ask_price", not: ["too_expensive"] },
    { say: "¿Cuánto cuesta la entrada?", intent: "ask_price" },
    { say: "¿Hay que reservar?", intent: "ask_book" },
    { say: "¿Está abierto hoy?", intent: "ask_open" },
    { say: "¿Es seguro de noche?", intent: "ask_safe" },
    { say: "¿La playa es segura de noche?", intent: "ask_safe" },
    { say: "¿Qué se puede hacer en la noche?", intent: "ask_night" },
    { say: "¿Dónde está el mejor café?", intent: "ask_coffee" },
    { say: "¿Dónde hay buen café?", intent: "ask_food", slots: { cuisine: "cafe" } },
    { say: "¿Vale la pena el cenote?", intent: "ask_about_spot", slots: { spot: "cenote" } },
    { say: "¿Está lejos el cenote?", intent: "ask_walk", slots: { spot: "cenote" } },
    { say: "El cenote, tal vez", intent: "spot_ctx", step: "sight", slots: { spot: "cenote" } },
    { say: "¡Gracias por la recomendación!", intent: "thanks_tip" },
    { say: "¡Suena muy bien!", intent: "thanks_tip" },
    { say: "¡Voy a ir!", intent: "thanks_tip" },
    { say: "No, es todo. ¡Gracias por los consejos!", intent: "more_no", step: "more" },
    { say: "Eso es todo", intent: "more_no", step: "more" },
    { say: "Soy de Canadá", intent: "from_ctx", step: "from", slots: { country: "canada" } },
    { say: "Soy estadounidense", intent: "from_ctx", step: "from" },
    { say: "Sí, tengo hambre", intent: "ask_food", step: "food" },
    { say: "Sí, ¡qué día tan bonito!", intent: "weather_ok" },
    { say: "Soy vegetariana", intent: "diet" },
    { say: "Prefiero algo tranquilo", intent: "no_crowds" },
    { say: "Está muy lejos para caminar", intent: "no_walk" },
    { say: "¿Pasa un colectivo?", intent: "no_walk" },
    { say: "¿Me lo puede repetir?", intent: "g_repeat" },
    // learners' Spain forms are correct answers too: coger, marisco, apetecer, vale
    { say: "¿Dónde cojo el colectivo?", intent: "no_walk" },
    { say: "Me apetece marisco", intent: "food_ans", step: "food_kind", slots: { cuisine: "mariscos" } },
    { say: "¿Hay algún sitio para comer marisco?", intent: "ask_food" },
    { say: "Vale, eso es todo", intent: "more_no", step: "more" },
    // meaning must not flip
    { say: "No me gustan los museos", intent: "sight_neg", not: ["ask_sight", "ask_about_spot"] },
    { say: "No quiero ir al cenote", intent: "sight_neg", not: ["ask_about_spot", "ask_walk"] },
    { say: "No es caro", intent: "not_far", not: ["too_expensive", "ask_price"] },
    { say: "No está lejos", intent: "not_far", not: ["ask_walk", "no_walk"] },
    { say: "No quiero comprar fruta", intent: "none" },
    { say: "Mariscos no", intent: "food_neg", step: "food_kind", not: ["food_ans"] },
    { say: "No tacos, mariscos", intent: "food_ans", step: "food_kind", slots: { cuisine: "mariscos", bad: "tacos" } },
    { say: "No quiero ir al museo, prefiero la playa", intent: "ask_about_spot", slots: { spot: "playa", bad: "museo" } },
    { say: "No soy vegetariano", intent: "none" },
    { say: "No vivo aquí", intent: "none" },
    { say: "No necesito recomendaciones", intent: "none" },
    // the review's traps and gaps
    { say: "No me gustaría ir a la playa", intent: "sight_neg", step: "sight", not: ["ask_about_spot", "spot_ctx"], slots: { spot: "playa" } },
    { say: "Prefiero no ir a la playa", intent: "sight_neg", step: "sight", not: ["ask_about_spot", "spot_ctx"] },
    { say: "Ya conozco el cenote", intent: "sight_neg", step: "sight", not: ["ask_about_spot", "spot_ctx"], slots: { spot: "cenote" } },
    { say: "Ya fui a las ruinas", intent: "sight_neg", step: "sight", not: ["ask_about_spot", "spot_ctx"] },
    { say: "No, no tengo hambre", intent: "not_hungry", step: "food", not: ["ask_food", "hungry_ctx"] },
    { say: "Ya comí tacos", intent: "not_hungry", step: "food", slots: { cuisine: "tacos" }, not: ["ask_food"] },
    { say: "No soy de aquí", intent: "recommend_vague", not: ["are_you_local"] },
    { say: "No soy de aquí, ¿qué me recomienda?", intent: "recommend_vague", not: ["are_you_local"] },
    { say: "No soy de Estados Unidos, soy de Canadá", intent: "from_ctx", step: "from", slots: { country: "canada", bad: "usa" } },
    { say: "¿No es peligroso de noche?", intent: "ask_safe" },
    { say: "¿Es peligrosa la playa de noche?", intent: "ask_safe" },
    { say: "¿Las ruinas están lejos?", intent: "ask_walk", slots: { spot: "ruinas" }, not: ["not_far"] },
    { say: "¿Están abiertos los puestos hoy?", intent: "ask_open", slots: { spot: "puestos" } },
    { say: "¿No hay que reservar?", intent: "ask_book" },
    { say: "¿Cuánto cuesta el colectivo?", intent: "ask_price" },
    { say: "Tengo mucha hambre, ¿a dónde voy?", intent: "ask_food" },
    { say: "¿Y para cenar?", intent: "ask_food" },
    { say: "Lo que sea, no soy exigente", intent: "food_ans", step: "food_kind" },
    { say: "Muchas gracias por todo", intent: "thanks_tip" },
    { say: "Mil gracias por los consejos", intent: "thanks_tip" },
    // revision 2 Nov 2026: La Cocina de Lucía (the place "trattoria"), no Italian place, meatless tips
    { say: "¿Conoce La Cocina de Lucía?", intent: "ask_about_spot", slots: { spot: "trattoria" } },
    { say: "¿Cómo llego a La Cocina de Lucía?", intent: "ask_walk", slots: { spot: "trattoria" } },
    { say: "¿Hay un restaurante yucateco por aquí?", intent: "ask_about_spot", slots: { spot: "trattoria" } },
    { say: "¿Hay un restaurante italiano por aquí?", intent: "ask_food", slots: { cuisine: "italiana" } },
    { say: "¿Hay un restaurante italiano barato?", intent: "ask_food", slots: { cuisine: "italiana" } },
    { say: "¿Dónde puedo comer pizza?", intent: "ask_food", slots: { cuisine: "italiana" } },
    { say: "Somos veganos", intent: "diet" },
    { say: "No como carne ni pescado", intent: "diet" },
    { say: "Algo sin carne, por favor", intent: "food_ans", step: "food_kind", slots: { cuisine: "vegetariana" } },
    { say: "¿Dónde venden poc chuc?", intent: "ask_food", slots: { cuisine: "yucateca" } },
    { say: "¿A qué hora abre La Cocina de Lucía?", intent: "ask_open", slots: { spot: "trattoria" } },
    { say: "¿Es caro el restaurante de Lucía?", intent: "ask_price", slots: { spot: "trattoria" }, not: ["too_expensive"] },
    { say: "¿Hay que reservar en La Cocina de Lucía?", intent: "ask_book" },
    { say: "No quiero comida italiana", intent: "food_neg", step: "food_kind", not: ["food_ans"] },
    { say: "No quiero ir a La Cocina de Lucía", intent: "sight_neg", not: ["ask_about_spot", "ask_walk"] },
    { say: "La Cocina de Lucía no está lejos", intent: "not_far", not: ["ask_walk"] },
    { say: "Pizza no, mejor algo de aquí", intent: "food_ans", step: "food_kind", slots: { cuisine: "yucateca", bad: "italiana" } },
    { say: "No soy vegana", intent: "none" },
    { say: "Mi amiga Lucía cocina muy bien", intent: "none" },
    // review 2 Nov 2026
    { say: "No soy vegana, pero no como carne", intent: "diet" },
    { say: "Soy vegetariano, pero sí como huevo", intent: "diet" },
    { say: "No soy vegetariana, como de todo", intent: "food_ans", step: "food_kind", not: ["diet", "food_neg"] },
    { say: "Ah, pero no como carne", intent: "diet" },
    { say: "¿Y no hay pizza?", intent: "ask_food", slots: { cuisine: "italiana" } },
    { say: "¿Y otro lugar para comer?", intent: "ask_food", not: ["ask_sight"] },
    { say: "¿Dónde puedo probar el poc chuc?", intent: "ask_food", slots: { cuisine: "yucateca" } },
    { say: "No quiero gastar mucho, ¿dónde como?", intent: "budget", not: ["too_expensive"] },
    // audit 5 Nov 2026: places that aren't tips, taxis and colectivos, her name, "¿Qué es…?" / "¿Dónde queda…?"
    { say: "¿Dónde hay un cajero?", intent: "ask_place", slots: { place: "banco" } },
    { say: "¿Dónde está el banco?", intent: "ask_place", slots: { place: "banco" } },
    { say: "Necesito sacar dinero", intent: "ask_place" },
    { say: "¿Dónde está el mercado?", intent: "ask_place", slots: { place: "mercado" } },
    { say: "¿Dónde está la iglesia?", intent: "ask_place", slots: { place: "iglesia" } },
    { say: "¿Está lejos la farmacia?", intent: "ask_place", slots: { place: "farmacia" }, not: ["ask_walk"] },
    { say: "¿Cómo llego al hotel Mar Azul?", intent: "ask_place", slots: { place: "hotel" }, not: ["ask_walk"] },
    { say: "¿Cómo se llama usted?", intent: "her_name" },
    { say: "¿Dónde tomo un taxi?", intent: "no_walk" },
    { say: "¿Puedo ir en taxi?", intent: "no_walk" },
    { say: "¿Dónde tomo el colectivo?", intent: "no_walk" },
    { say: "¿Qué es un cenote?", intent: "ask_about_spot", slots: { spot: "cenote" } },
    { say: "Trabajo en un banco", intent: "none" },
    { say: "No necesito un cajero", intent: "none" },
    { say: "Mi hotel es muy bonito", intent: "none" },
    // not understood
    { say: "Mi perro se comió mis tacos", intent: "none" },
    { say: "lancha banana museo", intent: "none" },
    { say: "El lunes compré una computadora", intent: "none" },
  ],

  sims: [
    { name: "local, cheap food, what to see, follow-ups", turns: ["Disculpe, ¿es usted de aquí?", "¿Me puede recomendar un lugar para comer? Que no sea muy caro.", "¿Se puede ir caminando?", "¿Qué vale la pena ver aquí?", "¿Hay muchos turistas?", "¡Gracias por los consejos!"],
      expect: { complete: true }, auto: AUTO, setup: (s) => { s.walkTwist = false; } },
    { name: "vague question, seafood, too expensive, night", turns: ["¡Hola! ¿Qué me recomienda?", "Para comer", "Mariscos", "¿Es caro?", "¿Hay algo más barato?", "¿Qué se puede hacer en la noche?", "¿Es seguro de noche?", "¡Me ayudó mucho!"],
      expect: { complete: true }, auto: AUTO, setup: (s) => { s.walkTwist = false; } },
    // her optional "¿De dónde es?" is pinned on: the learner skips it with a follow-up about the sight, and
    // "Sí, por favor" answers "¿Y tiene hambre?" that follows.
    { name: "sights first, no fish, booking", turns: ["¡Buenas tardes!", "¿Qué no me puedo perder?", "¿Cómo llego?", "Sí, por favor", "No como pescado", "¿Hay que reservar?", "¡Suena muy bien! ¡Adiós!"],
      expect: { complete: true }, auto: AUTO, setup: (s) => { s.askFrom = true; s.walkTwist = false; s.weatherOpen = false; s.triedTip = undefined; } },
    { name: "fruit at the stalls, safety first, then tips", turns: ["¡Hola!", "Quiero comprar fruta.", "¿A qué hora cierran?", "¿La playa es segura de noche?", "Algo que ver.",
      "¿Dónde se come bien por aquí?", "Comida italiana, por favor.", "¡Muchas gracias!"], expect: { complete: true, state: { marketTip: true } }, auto: AUTO, setup: (s) => { s.walkTwist = false; } },
    { name: "coffee, locals and a lot of questions", turns: ["¿Dónde hay buen café?", "¿Cómo llego?", "¿A dónde va la gente de aquí?", "¿A qué hora es mejor ir?", "Me gustan los museos", "¿Está abierto hoy?", "¡Muchas gracias!"],
      expect: { complete: true }, auto: AUTO, setup: (s) => { s.walkTwist = false; } },
    // the review: "¿Es muy caro?" asks the price (not a complaint), "¿Está lejos?" never gets "Sí, cinco minutos"
    { name: "price questions, a refusal of a sight, the colectivo fare", turns: ["¿Dónde puedo comer mariscos?", "¿Es muy caro?", "¿Está lejos?", "Ya conozco el cenote", "¿Cuánto cuesta el colectivo?", "No me gustaría ir a la playa", "Mil gracias por todo"],
      expect: { complete: true, state: { cheap: undefined } }, auto: AUTO, setup: (s) => { s.walkTwist = false; s.weatherOpen = false; s.triedTip = undefined; s.askFrom = false; } },
    { name: "not from here, already ate, no thanks to the walk", turns: ["No soy de aquí, ¿qué me recomienda?", "Algo que ver", "Ya comí tacos", "No quiero molestarla, gracias", "¿Está abierto hoy?", "No, eso es todo. Muchas gracias por los consejos"],
      expect: { complete: true, state: { walkAnswered: true } }, auto: AUTO, setup: (s) => { s.walkTwist = true; s.weatherOpen = false; s.triedTip = undefined; s.askFrom = false; } },
    // revision 2 Nov 2026: no Italian place (a kind "no hay", then Lucía's or, cheap, the cocina económica), meatless tips
    { name: "Italian food? there's none: La Cocina de Lucía", turns: ["¿Hay un restaurante italiano por aquí?", "¿Cómo llego?", "¿Es caro?", "¿Qué vale la pena ver aquí?", "¡Gracias por los consejos!"],
      expect: { complete: true, state: { noItalian: true, cheap: undefined, veg: undefined } }, auto: AUTO, setup: (s) => { s.walkTwist = false; s.weatherOpen = false; s.triedTip = undefined; s.askFrom = false; } },
    { name: "cheap Italian: the cocina económica", turns: ["¿Hay un restaurante italiano barato?", "¿Está lejos?", "¿Qué vale la pena ver aquí?", "Eso es todo, gracias"],
      expect: { complete: true, state: { noItalian: true, cheap: true } }, auto: AUTO, setup: (s) => { s.walkTwist = false; s.weatherOpen = false; s.triedTip = undefined; s.askFrom = false; } },
    { name: "vegetarian: the papadzules at Lucía's", turns: ["Soy vegetariana", "¿Hay que reservar?", "¿Qué no me puedo perder?", "¡Muchas gracias!"],
      expect: { complete: true, state: { veg: true, vegan: undefined } }, auto: AUTO, setup: (s) => { s.walkTwist = false; s.weatherOpen = false; s.triedTip = undefined; s.askFrom = false; } },
    { name: "vegans: the cocina económica", turns: ["¡Hola! Somos veganos. ¿Dónde podemos comer?", "¿A qué hora es mejor ir?", "Sí, ¿qué me recomienda visitar?", "Eso es todo"],
      expect: { complete: true, state: { veg: true, vegan: true } }, auto: AUTO, setup: (s) => { s.walkTwist = false; s.weatherOpen = false; s.triedTip = undefined; s.askFrom = false; } },
    { name: "vegetarian, too pricey: the cocina económica, never the tacos", turns: ["Soy vegetariano", "Es un poco caro para mí", "¿Qué vale la pena ver aquí?", "Eso es todo"],
      expect: { complete: true, state: { veg: true, cheap: true } }, auto: AUTO, setup: (s) => { s.walkTwist = false; s.weatherOpen = false; s.triedTip = undefined; s.askFrom = false; } },
    { name: "cheap first, then no meat", turns: ["Busco un lugar para comer que no sea muy caro", "No como carne", "¿Cuánto cuesta?", "¿Qué vale la pena ver aquí?", "Eso es todo, gracias"],
      expect: { complete: true, state: { veg: true, cheap: true, vegan: undefined } }, auto: AUTO, setup: (s) => { s.walkTwist = false; s.weatherOpen = false; s.triedTip = undefined; s.askFrom = false; } },
    { name: "twist: did you go to La Cocina de Lucía?", turns: ["Sí, ya fui a La Cocina de Lucía", "¿Qué vale la pena ver aquí?", "¿Y para comer? Algo diferente", "Eso es todo, gracias"],
      expect: { complete: true }, auto: AUTO, setup: (s) => { s.triedTip = "trattoria"; s.weatherOpen = false; s.walkTwist = false; s.askFrom = false; } },
    // the twists, forced on every seed
    { name: "twist: did you try my tip? then she walks with you", turns: ["Sí, ¡me encantó!", "Quiero ir a las ruinas", "¿Pasa un colectivo?", "Sí, tengo hambre", "Algo típico", "¡Me encantaría, gracias!", "Eso es todo, gracias"],
      expect: { complete: true, state: { walkAnswered: true } }, auto: AUTO, setup: (s) => { s.triedTip = "taqueria"; s.weatherOpen = false; s.walkTwist = true; s.askFrom = false; } },
    { name: "twist: not yet, and no thanks to the walk", turns: ["Todavía no", "¿Hay cenotes por aquí?", "¿Cuánto cuesta la entrada?", "No, gracias", "No se preocupe, llego sola", "No, es todo. ¡Gracias por los consejos!"],
      expect: { complete: true, state: { walkAnswered: true } }, auto: AUTO, setup: (s) => { s.triedTip = "marquesitas"; s.weatherOpen = false; s.walkTwist = true; s.askFrom = false; } },
    // short answers, the weather opener and where she's from
    { name: "short answers", turns: ["Sí, ¡qué calor!", "¿Qué me recomienda?", "Algo que ver", "Soy de Irlanda", "¿Está lejos?", "Sí, mucha", "Tacos", "Eso es todo", "Adiós"],
      expect: { complete: true }, auto: AUTO, setup: (s) => { s.weatherOpen = true; s.triedTip = undefined; s.askFrom = true; s.walkTwist = false; } },
    // a follow-up before any tip: "¿De cuál me habla?"; then the second "¿Busca dónde comer, o algo que ver?"
    { name: "which place? then food", turns: ["¡Hola!", "¿Está muy lejos?", "El cenote", "¿Vale la pena?", "Sí, tengo hambre", "Comida yucateca", "Eso es todo"],
      expect: { complete: true }, auto: AUTO, setup: (s) => { s.weatherOpen = false; s.triedTip = undefined; s.askFrom = false; s.walkTwist = false; } },
    // audit 5 Nov 2026: side questions get answers (her name, the ATM, the market, a taxi), "No, gracias" to "¿Qué se le
    // antoja?" gets a tip instead of the same question, and the ways follow the 3D town
    { name: "side questions: her name, the ATM, the market, a taxi", turns: ["¿Cómo se llama usted?", "¿Dónde hay un cajero?", "¿Me puede recomendar un buen lugar para comer?", "No, gracias",
      "¿Dónde está el mercado?", "¿Qué vale la pena ver aquí?", "¿Dónde tomo un taxi?", "Eso es todo, gracias"],
      expect: { complete: true, state: { foodRec: true, sightRec: true } }, auto: AUTO, setup: (s) => { s.weatherOpen = false; s.triedTip = undefined; s.askFrom = false; s.walkTwist = false; } },
    { name: "seafood too pricey: the fish tacos; the ways to the pier and the market", turns: ["¿Dónde puedo comer mariscos?", "¿Cómo llego?", "Es muy caro para mí", "¿Dónde está la taquería?",
      "¿Qué es un cenote?", "¿Qué vale la pena ver aquí?", "¿Qué tal el cenote?", "Mil gracias por todo"],
      expect: { complete: true, state: { cheap: true } }, auto: AUTO, setup: (s) => { s.weatherOpen = false; s.triedTip = undefined; s.askFrom = false; s.walkTwist = false; } },
  ],
};

export default local;
