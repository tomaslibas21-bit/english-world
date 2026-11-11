// Song 75 "Something for a Headache" → Puerto Colibrí: "Algo para el dolor de cabeza"
// Farmacia del Puerto, Don Héctor (the pharmacist, usted). In Mexico most medicines are sold over the counter by the
// pharmacist himself (they're behind the counter): you say what's wrong ("me duele la cabeza", "tengo gripa", "me
// quemé con el sol", "me picaron los moscos"), he may ask whether it's for you, since when, other medicines and
// allergies, recommends something and says how to take it ("una cada ocho horas"), and asks "¿De patente o genérico?"
// (the brand-name one or the same substance, cheaper). Antibiotics are sold only with a doctor's prescription (la
// receta), which the pharmacy stamps or keeps; next door there's the pharmacy's doctor's office (el consultorio), a
// cheap visit with no appointment. Paying: cash or card at the counter.
// Kept from the English: the steps need, who, howlong, meds, allergy, recommend, dosage, more, pay, bag; the intents of
// the over-the-counter part; the twists store_brand (the brand-name one is out: the generic), rx_prompt (a returning
// customer: "¿Viene a surtir una receta?") and see_doctor (a week or more: see a doctor), which here offers the
// consultorio (twist "consultorio", also when the learner asks for an antibiotic without a prescription).
// Changed by the brief: the American prescription pickup (last name, spelling, date of birth, insurance, "ready in ten
// minutes") doesn't exist in a Mexican pharmacy, so rx_name, rx_spell, rx_dob, rx_ins and the wait are gone: the learner
// brings the paper prescription (rx_paper), he reads it (amoxicillin), asks brand-name or generic, stamps it and may ask
// about a penicillin allergy. New: the generic question (generic_q), the consultorio (doctor_q, go_doctor), diarrhea and
// mosquito bites, bug spray, electrolyte drink. Mexican-only words in lines have a neutral twin (pásele, híjole,
// ahorita, moscos, piquetes, agruras, surtir una receta → venir con una receta, de patente → de marca, ticket →
// recibo); "gripa" only in a hint (twin: gripe).
// Audit (5 Nov 2026): the advice is safe end to end (unsafeWhy): an allergy, other medicines or a child rule a medicine
// out wherever it comes from (his recommendation, the other one he offers, the learner's own request, something already
// on the counter); a cold medicine already has acetaminophen in it; cramps take ibuprofen and dizziness an electrolyte
// drink; dollars, the card machine, the receipt and the pharmacy's hours (8 a.m. to 10 p.m.) get answers.

import type { Ctx, EntityDef, Pending, SituationDef, Tip } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// Entities

const SYMPTOMS: EntityDef[] = [
  ent("headache", "dolor | de | cabeza", "pain | of | head", "m", { art: "", attrs: { nat: "headache" },
    forms: ["dolor de cabeza", "dolores de cabeza", "migraña", "migrana", "jaqueca", "un dolor de cabeza", "mucho dolor de cabeza", "dolor de cabesa"] }),
  ent("sore_throat", "dolor | de | garganta", "pain | of | throat", "m", { art: "", attrs: { nat: "sore throat" },
    forms: ["dolor de garganta", "garganta irritada", "la garganta irritada", "anginas", "carraspera", "dolor en la garganta", "la garganta"] }),
  ent("cough", "tos", "cough", "f", { art: "", forms: ["tos seca", "tos con flema", "mucha tos", "una tos", "toz"] }),
  ent("cold", "resfriado", "cold", "m", { art: "", forms: ["gripa", "gripe", "la gripa", "la gripe", "un resfriado", "catarro", "un catarro", "resfrio", "resfriado comun",
    "influenza", "un poco de gripa", "un poco de gripe"] }),
  ent("fever", "fiebre", "fever", "f", { art: "", forms: ["calentura", "temperatura", "mucha fiebre", "un poco de fiebre", "fiebre alta", "un poco de calentura", "fiebres"] }),
  ent("allergies", "alergia", "allergy", "f", { art: "", forms: ["alergias", "alergia al polen", "rinitis", "rinitis alergica", "una alergia"] }),
  ent("upset_stomach", "dolor | de | estómago", "pain | of | stomach", "m", { art: "", attrs: { nat: "stomachache" },
    forms: ["dolor de estomago", "agruras", "acidez", "acidez estomacal", "indigestion", "dolor de panza", "dolor de barriga", "gastritis", "nauseas", "nausea", "ganas de vomitar", "el estomago mal",
      "dolor de pansa", "malestar estomacal", "el estomago revuelto"] }),
  // (audit 5 Nov: cólicos and mareo were the stomach's, and got an antacid "when you feel heartburn": cramps take
  // ibuprofen, dizziness in the heat an electrolyte drink)
  ent("cramps", "cólicos", "cramps", "m", { art: "", pl: "cólicos", ltPl: "cramps",
    forms: ["colicos", "colico", "un colico", "unos colicos", "colicos menstruales", "dolor menstrual", "dolores menstruales", "colicos fuertes"] }),
  ent("dizzy", "mareo", "dizziness", "m", { art: "", forms: ["mareo", "mareos", "un mareo", "un poco de mareo", "mucho mareo", "vertigo"] }),
  ent("diarrhea", "diarrea", "diarrhea", "f", { art: "", forms: ["diarrea", "infeccion estomacal", "infeccion en el estomago", "una infeccion estomacal", "el estomago suelto",
    "diarea", "diarreas", "vomito", "vomitos", "vomitando"] }),
  ent("hangover", "cruda", "hangover", "f", { art: "", forms: ["resaca", "la cruda", "una cruda", "un poco de cruda", "una resaca", "la resaca"] }),
  ent("sunburn", "quemadura | de | sol", "burn | of | sun", "f", { art: "", attrs: { nat: "sunburn" },
    forms: ["quemadura de sol", "quemaduras de sol", "quemadura del sol", "quemaduras del sol", "quemadura solar", "quemaduras", "una quemadura de sol", "la piel quemada"] }),
  ent("bites", "piquetes | de | mosquito", "bites | of | mosquito", "m", { art: "", pl: "piquetes | de | mosquito", ltPl: "bites | of | mosquito", attrs: { nat: "mosquito bites" },
    forms: ["piquetes de mosco", "piquetes de moscos", "piquetes de mosquitos", "picaduras de mosquito", "picaduras de mosquitos", "picaduras", "piquetes",
      "ronchas", "piquetes de zancudo", "picaduras de insecto", "piquetes de insecto", "piquetes de animal", "comezon", "picazon"] }),
];

// price / generic: cents of a peso (brand-name / generic); pro: the object pronoun ("¿Se lo doy?")
const PRODUCTS: EntityDef[] = [
  ent("ibuprofen", "ibuprofeno", "ibuprofen", "m", { art: "", forms: ["advil", "motrin", "ibuprofeno de cuatrocientos", "analgesico", "un analgesico",
    "pastillas para el dolor", "algo para el dolor", "un desinflamatorio", "antiinflamatorio", "un antiinflamatorio", "ibuprofen", "ibuprofeno generico"],
    attrs: { price: 9500, generic: 3500, pro: "lo", med: true, food: "with", drowsy: "no" } }),
  ent("aspirin", "aspirina", "aspirin", "f", { art: "", forms: ["aspirinas", "una aspirina", "unas aspirinas", "acido acetilsalicilico", "bayer"],
    attrs: { price: 4500, pro: "la", med: true, food: "with", drowsy: "no" } }),
  ent("acetaminophen", "paracetamol", "acetaminophen", "m", { art: "", forms: ["tempra", "tylenol", "un tylenol", "un tempra", "acetaminofen", "acetaminofeno",
    "panadol", "paracetamol de quinientos", "paracetamol generico", "paracetamol"],
    attrs: { price: 6500, generic: 2500, pro: "lo", med: true, food: "any", drowsy: "no" } }),
  ent("cough_syrup", "jarabe | para | la | tos", "syrup | for | the | cough", "m", { pl: "jarabes | para | la | tos", ltPl: "syrups | for | the | cough", attrs: {
    nat: "cough syrup", natPl: "cough syrups", price: 12500, pro: "lo", med: true, food: "any", drowsy: "little" },
    forms: ["jarabe", "un jarabe", "jarabe para tos", "jarabe para la tos", "un jarabe para la tos", "jarabe contra la tos", "algo para la tos en jarabe"] }),
  ent("lozenges", "pastillas | para | la | garganta", "lozenges | for | the | throat", "f", { art: "", pl: "pastillas | para | la | garganta", ltPl: "lozenges | for | the | throat",
    attrs: { nat: "throat lozenges", natPl: "throat lozenges", price: 8500, pro: "las", med: true, food: "any", drowsy: "no" },
    forms: ["pastillas para la garganta", "pastillas para el dolor de garganta", "pastillitas para la garganta", "caramelos para la garganta", "strepsils",
      "pastillas para la tos", "unas pastillas para la garganta"] }),
  ent("cold_medicine", "antigripal", "cold medicine", "m", { pl: "antigripales", ltPl: "cold medicines", attrs: { price: 9500, pro: "lo", med: true, food: "any", drowsy: "yes" },
    forms: ["un antigripal", "antigripales", "desenfriol", "pastillas para la gripa", "pastillas para la gripe", "medicina para la gripa", "medicina para la gripe",
      "algo para el resfriado", "pastillas para el resfriado", "antigripal"] }),
  ent("allergy_medicine", "loratadina", "loratadine", "f", { art: "", attrs: { price: 14000, generic: 4500, pro: "la", med: true, food: "any", drowsy: "no" },
    forms: ["antialergico", "un antialergico", "antihistaminico", "un antihistaminico", "clarityne", "claritin", "pastillas para la alergia", "loratadina generica"] }),
  ent("antacid", "antiácido", "antacid", "m", { pl: "antiácidos", ltPl: "antacids", attrs: { price: 6000, pro: "lo", med: true, food: "after", drowsy: "no" },
    forms: ["antiacido", "un antiacido", "antiacidos", "sal de uvas", "pepto", "pepto bismol", "melox", "alka seltzer", "tums", "algo para las agruras"] }),
  ent("oral_serum", "suero | oral", "rehydration drink | oral", "m", { attrs: { nat: "electrolyte drink", price: 3500, pro: "lo", med: true, food: "any", drowsy: "no" },
    forms: ["suero", "un suero", "suerito", "electrolit", "suero oral", "sueros", "sales de rehidratacion", "electrolitos", "bebida hidratante", "vida suero oral"] }),
  ent("aloe", "gel | de | aloe", "gel | of | aloe", "m", { attrs: { nat: "aloe gel", price: 9500, pro: "lo", skin: true },
    forms: ["aloe", "aloe vera", "gel de aloe vera", "sabila", "gel de sabila", "crema para las quemaduras", "algo para despues del sol", "after sun"] }),
  ent("sunscreen", "protector | solar", "protector | sun", "m", { art: "", attrs: { nat: "sunscreen", price: 29500, pro: "lo", skin: true },
    forms: ["bloqueador", "bloqueador solar", "un bloqueador", "protector", "protector solar", "crema solar", "crema para el sol", "filtro solar", "bloqueador biodegradable",
      "protector biodegradable", "bloquiador", "protectores solares", "protectores", "bloqueadores", "bloqueadores solares"] }),
  ent("itch_cream", "crema | para | la | comezón", "cream | for | the | itch", "f", { attrs: { nat: "anti-itch cream", price: 8000, pro: "la", skin: true },
    forms: ["crema para los piquetes", "pomada para los piquetes", "crema para la comezon", "pomada", "una pomada", "crema para la picazon", "calamina", "crema de calamina",
      "hidrocortisona", "crema con hidrocortisona", "crema para las picaduras"] }),
  ent("repellent", "repelente", "bug spray", "m", { art: "", attrs: { price: 12000, pro: "lo", skin: true },
    forms: ["repelente de mosquitos", "repelente de moscos", "repelente para los moscos", "repelente para los mosquitos", "repelente contra mosquitos", "repelente contra los moscos", "repelente para mosquitos", "repelente para moscos", "un repelente", "repelente de insectos", "off", "autan", "repelentes"] }),
  ent("bandaids", "curitas", "Band-Aids", "f", { art: "", pl: "curitas", ltPl: "Band-Aids", attrs: { price: 4500, pro: "las", noDose: true },
    forms: ["curita", "unas curitas", "tiritas", "unas tiritas", "venditas", "banditas", "band aid", "band aids", "vendas adhesivas", "curitas"] }),
  ent("vitamins", "vitamina | C", "vitamin | C", "f", { art: "", attrs: { nat: "vitamin C", price: 9000, pro: "la", food: "with", drowsy: "no" },
    forms: ["vitaminas", "vitamina c", "unas vitaminas", "vitamina", "multivitaminico", "un multivitaminico", "redoxon", "vitamina se"] }),
  ent("antibiotic", "amoxicilina", "amoxicillin", "f", { art: "", attrs: { price: 21000, generic: 8500, pro: "la", med: true, rx: true, food: "any", drowsy: "no" },
    forms: ["antibiotico", "un antibiotico", "antibioticos", "algun antibiotico", "penicilina", "amoxil", "azitromicina", "ciprofloxacino", "amoxicilina generica", "amoxisilina"] }),
];

const ALL = [...SYMPTOMS, ...PRODUCTS];
const at = (id: string) => ALL.find((e) => e.id === id)?.attrs || {};

const REC: Record<string, string> = {
  headache: "ibuprofen", sore_throat: "lozenges", cough: "cough_syrup", cold: "cold_medicine", fever: "acetaminophen",
  allergies: "allergy_medicine", upset_stomach: "antacid", diarrhea: "oral_serum", sunburn: "aloe", bites: "itch_cream", hangover: "oral_serum",
  cramps: "ibuprofen", dizzy: "oral_serum",
};
const ALT: Record<string, string> = { ibuprofen: "acetaminophen", acetaminophen: "ibuprofen", cough_syrup: "lozenges", lozenges: "cough_syrup", cold_medicine: "acetaminophen" };
const MAX_CASH = 150000;

/** Why a medicine isn't right for this customer (the line that says so), or undefined (audit 5 Nov 2026): an allergy
 *  to aspirin or another anti-inflammatory rules out ibuprofen and aspirin, one to acetaminophen rules out it and the
 *  cold medicine (which has it in it); blood-pressure pills, and heart, depression, sleeping or anxiety pills
 *  ("risk"), rule out ibuprofen and the cold medicine (its decongestant and antihistamine), diabetes or thyroid pills
 *  ("gland") the cold medicine; a child never gets aspirin. */
function unsafeWhy(c: Ctx, id: string): string | undefined {
  if (c.s.mode === "rx") return undefined;
  if ((id === "ibuprofen" || id === "aspirin") && c.s.allergy === "nsaid") return "nsaid_reason";
  if ((id === "acetaminophen" || id === "cold_medicine") && c.s.allergy === "para") return "para_reason";
  if (id === "aspirin" && c.s.forWho === "child") return "kids_aspirin";
  if (id === "ibuprofen" && c.s.meds === "bp") return "bp_reason";
  if (id === "cold_medicine" && c.s.meds === "bp") return "bp_reason_cold";
  if (id === "ibuprofen" && c.s.meds === "risk") return "mix_reason";
  if (id === "cold_medicine" && (c.s.meds === "risk" || c.s.meds === "gland")) return "mix_reason_cold";
  return undefined;
}
/** The other medicine he offers after a no ("Si prefiere, también tengo…"): never one he has just ruled out, nor the
 *  one the learner already took without relief. */
function safeAlt(c: Ctx, id: string): string | undefined {
  const a = ALT[id];
  return a && !unsafeWhy(c, a) && a !== c.s.took ? a : undefined;
}
/** The painkiller he can give instead: acetaminophen, else ibuprofen (an acetaminophen allergy); none: the doctor. */
const safeAnalgesic = (c: Ctx) => ["acetaminophen", "ibuprofen"].find((x) => !unsafeWhy(c, x));

// ---------------------------------------------------------------------------
// State helpers

const basket = (c: Ctx) => c.s.basket as string[];
const product = (c: Ctx) => c.s.product as string | undefined;
const gen = (c: Ctx) => c.s.gen as Record<string, boolean>;
const last = (x: any) => (Array.isArray(x) ? x[x.length - 1] : x);

function priceOf(c: Ctx, id: string): number {
  const a = at(id);
  return a.generic && gen(c)[id] !== false ? a.generic : a.price;
}
/** Boxes of one product ("Deme dos cajas de paracetamol"); one unless a number was said. */
const qtyOf = (c: Ctx, id: string) => ((c.s.qty as Record<string, number> | undefined)?.[id] ?? 1);
const qtyFromTags = (tags: string[]) => (tags.includes("q3") ? 3 : tags.includes("q2") ? 2 : 1);
function setQty(c: Ctx, id: string, q: number) {
  const m = (c.s.qty ??= {}) as Record<string, number>;
  if (q > 1) m[id] = q; else delete m[id];
}
const total = (c: Ctx) => basket(c).reduce((s, id) => s + priceOf(c, id) * qtyOf(c, id), 0);
/** What is still to pay: the counter less what was paid already (something asked for after paying is a second sale). */
const due = (c: Ctx) => total(c) - ((c.s.paidSum as number | undefined) ?? 0);
/** Paid for already: never switched, swapped or put back. */
const locked = (c: Ctx, id: string) => ((c.s.paidIds as string[] | undefined) ?? []).includes(id);

/** The recommended product for the symptom, adjusted for an allergy or other medicines (unsafeWhy: cold medicines
 *  have a decongestant that raises blood pressure), and never the one the learner says didn't help. */
function recommendation(c: Ctx): string {
  let p = REC[c.s.symptom] ?? "ibuprofen";
  if (p === c.s.took && safeAlt(c, p)) p = safeAlt(c, p)!;
  if (unsafeWhy(c, p)) p = safeAnalgesic(c) ?? ""; // ("": nothing he can give safely, noSafe)
  return p;
}

/** "¿Se lo doy?" / "¿Se la doy?" / "¿Se las doy?": the pronoun agrees with the medicine. */
const sayRecQ = (c: Ctx, id: string, again = false) => c.say((again ? "rec_again_" : "rec_q_") + (at(id).pro || "lo"));
/** "Pastillas para la garganta", "curitas": plural (aquí tiene, ¿cómo se toman?). */
const plural = (id: string) => at(id).pro === "los" || at(id).pro === "las";

const TIPS: Record<string, Tip> = {
  tu_staff: { key: "tu_staff", lt: "Understood! With the pharmacist, usted is more polite: “¿Tiene…?”, “¿Me da…?” (tienes / dame is for friends).", better: "¿Tiene algo para el dolor de cabeza?" },
  constipado: { key: "constipado", lt: "Understood! Careful: in Mexico “estoy constipado” means constipated. For a cold, say “tengo gripa” or “estoy resfriado”.", better: "Tengo gripa." },
};

// Automatic answers the simulation uses when Don Héctor asks an optional question.
const AUTO: Record<string, string> = {
  rx_prompt: "No, necesito algo para el dolor de cabeza", need: "¿Tiene algo para el dolor de cabeza?", sick_q: "Me duele la cabeza", who: "Sí, es para mí",
  who_q: "Es para mí", howlong: "Desde ayer", meds: "No, no tomo nada", allergy: "No, no soy alérgico a nada", recommend: "Sí, me lo llevo", alt: "Sí, está bien",
  generic_q: "El genérico, por favor", dosage: "No", questions_q: "No, ninguna, gracias", more: "Es todo, gracias", extra: "No, gracias",
  pay: "Con tarjeta", bag: "No, gracias", rx_paper: "Aquí está la receta", doctor_q: "No, gracias",
};
const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// ---------------------------------------------------------------------------

export const pharmacy: SituationDef = {
  id: "s75-pharmacy",
  song: 75,
  songTitle: "Something for a Headache",
  title: { en: "Algo para el dolor de cabeza", lt: "Something for a headache" },
  topic: { en: "En la farmacia", lt: "At the pharmacy" },
  chapter: 3,
  order: 5,
  location: "pharmacy",
  npc: "okafor",
  goal: "Tell the pharmacist what's wrong (or what you need), choose a medicine, ask how to take it, and pay.",
  intro: "Farmacia del Puerto. In Mexico the pharmacist hands you most medicines over the counter: say what hurts (“Me duele la cabeza”) and he recommends something. Brand-name or generic? Antibiotics need a doctor's prescription (una receta); the doctor's office next door is cheap. Prices are in pesos.",
  entities: { symptom: SYMPTOMS, product: PRODUCTS },

  grammar: {
    macros: {
      // how people ask for something (usted, tú to staff, a few Spain forms)
      need_pre: "(tiene | tienen | tendra | tendran | me da | me puede dar | me podria dar | me vende | me puede vender | vende | venden | quiero | quisiera | necesito | ocupo | busco | ando buscando | estoy buscando | deme | me pone | ponme | hay | vengo por | vine por | tienes #tip:tu_staff | me das #tip:tu_staff | dame #tip:tu_staff | me vendes #tip:tu_staff)",
      sth: "(algo | alguna cosa | algun medicamento | alguna medicina | medicina | un medicamento | medicamento | unas pastillas | pastillas | una pastilla | algun remedio | un remedio | algo bueno | algo fuerte | alguna pastilla | algo que tomar)",
      for_sym: "(para | contra) [el | la | los | las | un | una | mi] {symptom}",
      // "algo para la garganta": the body part says the symptom
      for_body: "(para | contra) (la cabeza #s_headache | la garganta #s_sore_throat | el estomago #s_upset_stomach | la panza #s_upset_stomach | la barriga #s_upset_stomach | la tos #s_cough | los moscos #s_bites | los mosquitos #s_bites | el sol #s_sunburn | las quemaduras #s_sunburn | la comezon #s_bites | el resfriado #s_cold | la gripa #s_cold | la gripe #s_cold)",
      duele: "(me duele | me esta doliendo | me anda doliendo | me duele mucho | me duele un poco | me duele bastante)",
      have: "(tengo | traigo | ando con | estoy con | tengo un poco de | tengo mucha | tengo mucho | creo que tengo | me dio | me pego | me agarro | me esta dando | creo que me esta dando)",
      since: "(desde (ayer #d1 | ayer (en | por) la (manana | tarde | noche) #d1 | anoche #d1 | hoy #d0 | esta manana #d0 | la manana #d0 | (en | por) la manana #d0 | el fin de semana #d3 | la semana pasada #d7 | antier #d2 | antenoche #d2 | antes de ayer #d2 | el {day} #d3 | hace (unos | como)? ({n:number} (dias #unit_d | dia #unit_d | semanas #unit_w | semana #unit_w | horas #unit_h) | una semana #d7 | un dia #d1 | un mes #d30 | rato #d0 | poco #d0 | mucho #d14)) | hace [como | unos | mas o menos | casi | ya] ({n:number} (dias #unit_d | dia #unit_d | semanas #unit_w | semana #unit_w | horas #unit_h) | una semana #d7 | un dia #d1 | un mes #d30 | un rato #d0 | unas horas #d0 | poco #d0 | mucho tiempo #d14 | mucho #d14) | todo el dia #d0 | toda la noche #d1)",
      dur: "([como | unos | mas o menos | casi] ({n:number} (dias #unit_d | dia #unit_d | semanas #unit_w | semana #unit_w | horas #unit_h) | una semana #d7 | un dia #d1 | un mes #d30 | un par de dias #d2 | unos dias #d3 | varios dias #d4))",
      rel_child: "(hijo | hija | nino | nina | bebe | hijos | ninos | nene | nena | chamaco | chamaca | nieto | nieta)",
      rel_adult: "(esposo | esposa | mama | mamá | papa | madre | padre | amigo | amiga | pareja | novio | novia | abuela | abuelo | hermano | hermana | mujer | marido | companero | companera | suegra | suegro)",
      allergen: "(la aspirina #nsaid | aspirina #nsaid | el ibuprofeno #nsaid | ibuprofeno #nsaid | los antiinflamatorios #nsaid | el naproxeno #nsaid | la penicilina #pen | penicilina #pen | la amoxicilina #pen | amoxicilina #pen | los antibioticos #other | las sulfas #other | el paracetamol #para | paracetamol #para | el acetaminofen #para | los mariscos #other | el polen #other | el polvo #other | los gatos #other | el latex #other | la codeina #other | el huevo #other | la lactosa #other | las nueces #other | los cacahuates #other)",
      it: "(lo | la | los | las)",
      tomo: "(tomo | me tomo | debo tomar | tengo que tomar | se toma | se toman | hay que tomar | me lo tomo | me la tomo | lo tomo | la tomo | los tomo | las tomo)",
      kid: "(un nino | una nina | ninos | los ninos | mi hijo | mi hija | un bebe | bebes | mis hijos | ninos chiquitos | criaturas)",
      when: "(anoche | ayer | hoy | esta manana | en la playa | (en | por) la noche | ayer (en | por) la noche | en el cenote | (en | por) la tarde)",
      gen: "(generico #gen | generica #gen | el generico #gen | la generica #gen | genericos #gen | de patente #pat | el de patente #pat | la de patente #pat | original #pat | el original #pat | de marca #pat | el de marca #pat)",
      // "Deme dos cajas de paracetamol": the number is counted (never read as "dosis")
      qty: "(dos #q2 | tres #q3)",
      unit: "(cajas | cajitas | frascos | tubos | botes | paquetes | botellas | sobres)",
    },
    slots: {
      // "me duele la cabeza": the body part says the symptom
      bodypart: { lexicon: [
        { id: "headache", forms: ["la cabeza", "cabeza", "la cabesa"] },
        { id: "sore_throat", forms: ["la garganta", "garganta"] },
        { id: "upset_stomach", forms: ["el estomago", "estomago", "la panza", "panza", "la barriga", "barriga", "la pancita", "la tripa", "el estomago y la cabeza"] },
      ] },
    },
  },

  intents: {
    // --- what's wrong -------------------------------------------------------------------------------
    need_symptom: { patterns: [
      "@need_pre @sth @for_sym #h:sth_for", "(solo | nada mas | nomas) @need_pre @sth (@for_sym | @for_body)", "@need_pre @sth @for_body", "[y] @sth @for_sym", "@sth @for_body",
      "que (me recomienda | recomienda | me da | me puede dar | puedo tomar | tomo | es bueno | sirve | me sirve | le doy | hay | tiene | tienen | vende | venden) @for_sym #h:what_take", "que (me recomienda | puedo tomar | me da | es bueno) @for_body",
      "(tiene | tienen | hay) algo (bueno | que sirva) @for_sym", "(me puede | podria) recomendar algo @for_sym", "(me puede | podria) (dar | vender) algo @for_sym",
      "(medicina | pastillas | medicamento | algo) (para | contra) {symptom}", "que (sirve | es bueno) (para | contra) [el | la] {symptom}",
      "(tenéis | teneis | me poneis) algo @for_sym",
    ] },
    symptom_state: { patterns: [
      "@duele {symptom:bodypart} [@since] #h:sym_hurts", "@duele (mucho | un poco | bastante)? {symptom:bodypart} [@since]", "me (duele | duelen) [mucho] {symptom:bodypart} [desde hace rato]",
      "me quemé con el sol #s_sunburn #h:sym_sun", "me picaron los moscos #s_bites #h:sym_bites",
      "@have [mucha | mucho | un poco de | algo de] {symptom} [@since] #h:sym_have",
      // "No me duele la cabeza, me duele la garganta": the second one
      "no me duele (la cabeza | la garganta | el estomago | la panza) [sino] [me duele] {symptom:bodypart}", "no (tengo | es) {bad:symptom} (sino | tengo | es) {symptom}", "(tengo | traigo) [un | una] {symptom} [muy | bien]? (fuerte | horrible | terrible) [@since]",
      "@have {symptom} y {symptom} [@since]", "@have {symptom} [y] (me duele | me duelen) {symptom:bodypart}",
      "(creo que)? (me esta dando | me va a dar | me agarro | me dio) {symptom}",
      "(estoy | ando) (resfriado | resfriada | engripado | engripada | agripado | agripada) #s_cold [@since]", "(estoy | ando) (constipado | constipada) #s_cold #tip:constipado [@since]",
      "(tengo | traigo) (la nariz tapada | mocos | escurrimiento) #s_cold", "me escurre la nariz #s_cold", "(estornudo | estoy estornudando) (mucho)? #s_allergies [@since]",
      "(tengo | traigo) alergia [estornudo mucho | me pican los ojos]? #s_allergies", "me pican los ojos #s_allergies",
      "(estoy | ando) (mal | malo | mala) del estomago #s_upset_stomach [@since]", "(algo | la comida) me cayó mal #s_upset_stomach", "me cayó mal (la comida | algo) #s_upset_stomach",
      "(estoy | ando | me siento) (mareado | mareada | muy mareado | muy mareada) #s_dizzy [@since]", "me (mareo | mareé | maree) [mucho] #s_dizzy",
      "(me enfermé | estoy enfermo | estoy enferma) del estomago #s_upset_stomach", "(voy | he ido) mucho al bano #s_diarrhea", "(tengo | traigo) el estomago suelto #s_diarrhea", "(tengo | traigo) el estomago (mal | revuelto | raro | delicado) #s_upset_stomach", "(estoy | ando) (crudo | cruda) #s_hangover",
      "me (quemé | queme) (con | en) (el sol | la playa) [@when] #s_sunburn", "me (quemé | queme) [mucho] [@when] #s_sunburn", "me (asoleé | asolee) (mucho | demasiado)? #s_sunburn", "(tengo | traigo) la piel quemada #s_sunburn",
      "me (picaron | han picado) [mucho] (los | unos)? (moscos | mosquitos | zancudos | insectos | bichos) [@since | @when] #s_bites", "me (picaron | han picado) [mucho] [@when] #s_bites", "(tengo | traigo) (muchos | unos)? (piquetes | ronchas) #s_bites",
      "me (pica | pican) [mucho] (todo | la piel | los piquetes | las piernas | los brazos) #s_bites", "tengo comezon #s_bites",
      "(se me irrito | tengo irritada) la garganta #s_sore_throat", "me arde la garganta #s_sore_throat", "me (arde | duele) (la piel | la espalda) por el sol #s_sunburn",
      "(mi | a mi)? @rel_child (tiene | trae) {symptom} [@since] #child", "a mi @rel_child le duele {symptom:bodypart} [@since] #child",
      "(mi | a mi)? @rel_adult (tiene | trae) {symptom} [@since] #adult", "a mi @rel_adult le duele {symptom:bodypart} [@since] #adult",
    ] },
    // a bare "la cabeza" / "fiebre y tos" only answers "¿Qué síntomas tiene?" (rule 2)
    symptom_ctx: { patterns: ["{symptom} [@since]", "{symptom:bodypart}", "{symptom} y {symptom} [@since]", "(mucha | mucho | un poco de) {symptom}", "{symptom:bodypart} y {symptom}"] },
    feel_sick: { patterns: [
      "me siento mal #h:feel_sick", "no me siento bien", "me siento (muy | un poco | bastante)? (mal | enfermo | enferma | fatal | malito | malita)", "(estoy | ando) (enfermo | enferma | malo | mala | malito | malita)",
      "no me siento (muy)? bien", "me siento (raro | rara)", "me enfermé",
    ] },
    need_product: { patterns: [
      "@need_pre [un | una | unas | unos | una caja de | un frasco de | un tubo de | un paquete de | una cajita de | un bote de] {product} [@gen] #h:prod_have",
      "[un | una | unas | unos | una caja de | un frasco de] {product} [@gen] #h:prod_give", "(me | nos) (da | puede dar | podria dar | vende) [un | una | unas] {product} [@gen]",
      "(y | tambien | y tambien) [@need_pre] [un | una | unas] {product}", "(tambien | ademas) (quiero | necesito | me da | deme | me llevo) [un | una | unas] {product}",
      "(quiero | necesito | quisiera) (comprar | llevar | llevarme) [un | una | unas] {product}", "(me llevo | llevo) [tambien] [un | una | unas] {product}",
      "{product} [@gen] (tiene | tienen | hay | venden)", "(tenéis | teneis | vendéis | vendeis) {product}",
      "(solo | nada mas | nomas) @need_pre [un | una | unas | unos] {product} [@gen]", "(no es todo | todavia no | aun no) [tambien] @need_pre [un | una | unas | unos] {product}",
      "@need_pre @qty [@unit de] {product} [@gen]", "@qty [@unit de] {product} [@gen]", "(y | tambien | y tambien) [@need_pre] @qty [@unit de] {product} [@gen]",
    ] },
    // "No quiero ibuprofeno": never an order (it takes it back, or refuses the offer)
    not_product: { patterns: ["no (quiero | necesito | me de | me des #tip:tu_staff) [el | la | los | las | un | una | unas] {product}", "[el | la | los | las | un | una | unas] {product} no [gracias]", "sin {product}", "no (quiero | necesito) {product} [gracias]"] },
    // controlled medicines: a prescription and the doctor
    product_unknown: { patterns: [
      "@need_pre (pastillas para dormir | algo para dormir | un somnifero | somniferos | calmantes | un calmante | tramadol | codeina | clonazepam | diazepam | rivotril | viagra | insulina | antidepresivos | un antidepresivo)",
      "(pastillas para dormir | algo para dormir | tramadol | clonazepam | viagra)",
    ] },
    change_product: { patterns: [
      "mejor [deme | me da | quiero] [un | una | unas] {product}", "(prefiero | preferiria) [un | una | unas] {product}", "no {bad:product} (sino | mejor) [un | una | unas] {product}",
      "{bad:product} no (mejor | sino)? [un | una | unas] {product}", "(en vez de | en lugar de) {bad:product} [deme | mejor]? [un | una | unas] {product}",
      "[un | una | unas] {product} en (vez | lugar) de {bad:product}", "(cambiemelo | cambielo | cambiamelo #tip:tu_staff) por [un | una | unas] {product}",
      "no (quiero | me de) {bad:product} (quiero | deme | mejor | sino)? [un | una | unas] {product}",
    ] },
    other_option: { patterns: [
      "(tiene | hay | tienen) (otra cosa | algo mas | otro | otra | otra opcion | alguna otra opcion | algo diferente | algo distinto | otra marca) #h:other",
      "(que | cual) otra (cosa | opcion) (tiene | hay)", "(algo | otra cosa) que no sea (eso | ese | esa | {product})", "no (tiene | hay) (otra cosa | otro | otra)",
      "(y | pero)? (otra cosa | otra opcion)", "(tiene | hay) (algo | alguna cosa) (natural | mas natural | naturista | casero)", "(me puede | podria) (dar | recomendar) otra cosa",
    ] },
    // --- the pharmacist's questions -------------------------------------------------------------------
    who_ans: { patterns: [
      "(es | son) para mi #h:for_me", "para mi", "[si] (es | son) para mi", "[si] (el medicamento | la medicina | eso | esto | todo) (es | son) para mi [mismo | misma]", "(es | son) para mi (mismo | misma)",
      "[es | son] para (mi | un | una) @rel_child [de {n:number} anos] #child #h:for_child",
      "[es | son] para (mi | un | una) @rel_adult #adult #h:for_other", "no (es | son) para mi #notme", "(es | son) para (otra persona | alguien mas) #notme",
      "(mi | un | una) @rel_child [de {n:number} anos] #child", "(mi | un | una) @rel_adult #adult", "(tiene | mi hijo tiene | mi hija tiene) {n:number} anos #age",
      "(es | son) para (un nino | una nina | un bebe) #child", "no (es | son) para mi (es | son)? para (mi | un | una) @rel_child [de {n:number} anos] #child",
      "no (es | son) para mi (es | son)? para (mi | un | una) @rel_adult #adult",
    ] },
    howlong_ans: { patterns: [
      "@since #h:since", "(llevo | ya llevo | tengo | ya tengo | ando) @dur [asi | con (esto | eso | {symptom} | el dolor | la tos | la fiebre)]",
      "(empezó | comenzó | me empezó | me comenzó | me dio) (ayer #d1 | anoche #d1 | hoy #d0 | antier #d2 | esta manana #d0 | (en | por) la manana #d0 | el fin de semana #d3 | la semana pasada #d7 | el {day} #d3 | hace @dur)",
      "(empezó | comenzó | me empezó | me dio) @since", "(apenas | nada mas | solo) (hoy #d0 | desde hoy #d0 | desde ayer #d1 | ayer #d1 | desde anoche #d1)",
      "ya @dur", "@dur (ya | mas o menos)",
    ] },
    // a bare "Dos días" only answers "¿Desde cuándo?"
    howlong_ctx: { patterns: ["@dur", "(ayer #d1 | anoche #d1 | hoy #d0 | esta manana #d0 | antier #d2)"] },
    meds_ans: { patterns: [
      "no (tomo | estoy tomando | uso | consumo) (nada | ningun medicamento | ninguna medicina | otro medicamento | ninguno | ningun otro | nada mas | otra cosa) #none #h:meds_none",
      "[pero] (tomo | estoy tomando | uso) (pastillas | algo | medicina | medicamento | un medicamento | una pastilla) para la (presion #bp | presion alta #bp | hipertension #bp)  #h:meds_bp",
      "(solo | nada mas | nomas) (una pastilla | pastillas | algo | un medicamento | medicina) para la (presion | presion alta | hipertension) #bp",
      // "No tomo nada para la presión", "No tengo la presión alta": no (never the blood-pressure reading)
      "no (tomo | estoy tomando | uso) (nada | ningun medicamento | ninguna medicina | ninguna pastilla | pastillas | medicina | medicamento | algo) para la (presion | presion alta | hipertension) #none",
      "no (tengo | soy de) (la presion alta | presion alta | hipertension) #none", "no soy (hipertenso | hipertensa) #none",
      "no (tomo | estoy tomando | uso) (nada | ningun medicamento | ninguna medicina | ninguna pastilla | pastillas | medicina | medicamento | algo) para (la diabetes | la tiroides | el corazon | la depresion | el colesterol | dormir | la ansiedad) #none",
      // "Ya tomé paracetamol, pero no me hizo nada": what they already took (never an order)
      "ya (tomé | me tomé | tome | me tome) [un | una | unas] {product} [pero no me (hizo nada | sirvio | funciono | hizo efecto) | y no me (hizo nada | sirvio | funciono)] #took",
      // heart, depression, sleeping and anxiety pills or a daily aspirin (#risk): no ibuprofen, no cold medicine
      "(tomo | estoy tomando) (pastillas | algo | medicina | medicamento | insulina) para (la diabetes #gland | la tiroides #gland | el corazon #risk | la depresion #risk | el colesterol #other | dormir #risk | la ansiedad #risk)",
      "(tomo | estoy tomando) (vitaminas #vit | unas vitaminas #vit | anticonceptivos #other | la pastilla #other | aspirina #risk | una aspirina #risk | metformina #gland | losartan #bp | enalapril #bp | captopril #bp | insulina #gland) [diario | diaria | todos los dias | cada dia | al dia | en las mananas | para el corazon]",
      "(solo | nada mas | nomas) (vitaminas | unas vitaminas) #vit", "(soy | estoy) (hipertenso | hipertensa) #bp", "(tengo | soy de) (la presion alta | presion alta | hipertension) #bp",
      // "Tomo otro medicamento": which one? (never "no problem" for a medicine he doesn't know)
      "(si)? (tomo | estoy tomando) algo para la presion #bp", "(si)? (tomo | estoy tomando) (otro | otra | otras | otros) (medicamento | medicina | pastillas)? #which",
    ] },
    // bare "Nada" / "Ninguno" only after "¿Toma algún medicamento?"; "Para el corazón", "Metformina" after "¿Cuál?"
    meds_ctx: { patterns: [
      "(nada | ninguno | ninguna | ningun medicamento | ninguna medicina | nada nada)", "para la presion #bp", "(vitaminas | solo vitaminas) #vit",
      "[unas | una | algo | solo | nada mas]? (pastillas | pastilla | medicina)? para (la diabetes #gland | la tiroides #gland | el colesterol #other | el corazon #risk | la depresion #risk | dormir #risk | la ansiedad #risk | la presion alta #bp | la hipertension #bp)",
      "(metformina #gland | insulina #gland | anticonceptivos #other | la pastilla #other | levotiroxina #gland | atorvastatina #other | losartan #bp | enalapril #bp | captopril #bp | aspirina #risk | warfarina #risk | clopidogrel #risk | sertralina #risk | fluoxetina #risk | clonazepam #risk)",
      // a medicine he can't check: the safe choice (a bare "No sé" is the step's help; "no se" alone would read as "No")
      "(no se | no me acuerdo | no recuerdo) (como se llama | el nombre | cual es) #risk", "(no me acuerdo | no recuerdo) #risk",
    ] },
    allergy_ans: { patterns: [
      "no (soy | es) (alergico | alergica) a (nada | ningun medicamento | ninguno | ninguna medicina) #none #h:allergy_none", "no (tengo | tiene) (alergias | ninguna alergia | alergia a nada | alergia a ningun medicamento) #none",
      "que yo sepa no #none", "[no] ninguna alergia #none", "[no] no tengo ninguna alergia #none", "(no que yo sepa | creo que no) #none", "no soy (alergico | alergica) #none",
      "no (soy | es) (alergico | alergica) (a | al) @allergen #neg", "no (tengo | tiene) alergia (a | al) @allergen #neg", "[no] [a | al] @allergen no #neg",
      "(soy | es) (alergico | alergica) (a | al) @allergen #h:allergy_pen", "(tengo | tiene) alergia (a | al) @allergen", "me (hace | hacen | cae | caen) mal @allergen", "(si)? soy (alergico | alergica) [a] @allergen",
      // "Ah, pero soy alérgico al paracetamol" with the medicine on the counter: it goes back
      "pero (soy | es) (alergico | alergica) (a | al) @allergen", "pero (tengo | tiene) alergia (a | al) @allergen",
      // "No, solo a la aspirina": that one
      "[no] (solo | nada mas | nomas | nomas a | solamente) [a | al] @allergen",
    ] },
    allergy_ctx: { patterns: ["[si] [a | al] @allergen", "(nada | ninguno | ninguna | a nada | a ninguno | a ninguna)", "no tengo (ninguna | ninguno)"] },
    // --- the recommendation -------------------------------------------------------------------------
    accept_rec: { patterns: [
      "[si] (me lo | me la | me los | me las) llevo #h:take_it", "[si] @it llevo", "[si] @it (pruebo | voy a probar | quiero probar)", "[si] (deme | me da) (ese | esa | esos | esas | eso | uno | una)",
      "[si] (demelo | demela | demelos | demelas | damelo #tip:tu_staff)", "(esta bien | perfecto | ok | va | sale | bueno | de acuerdo) (demelo | demela | demelos | demelas | me lo llevo | me la llevo | me los llevo | me las llevo)",
      "[si] (deme | me da | me llevo) @qty [@unit]",
      "si @it quiero", "(ese | esa | eso) (esta bien | me sirve)", "[si] (me lo | me la) da", "[si] (lo | la) compro", "[si] (ese | esa | eso) (por favor)?",
    ] },
    // "Sí, está bien" / "Perfecto" (an ordinary yes, credited to the phrasebook where the offer is open)
    accept_ctx: { patterns: ["[si] (esta bien | perfecto | ok | va | sale | de acuerdo | bueno | orale | andale | esta perfecto | vale) #h:ok_fine", "si por favor", "si gracias"] },
    decline_rec: { patterns: [
      "no @it (quiero | necesito | voy a llevar | llevo) #h:decline", "no (me lo | me la | me los | me las) llevo", "(mejor | creo que) no [gracias]", "no me interesa",
      "lo voy a pensar", "no (quiero | necesito) (nada | eso | ese | esa | nada de eso)", "(prefiero | mejor) no (tomar nada | tomar pastillas | tomar medicinas)",
      "(asi | asi estoy) bien gracias", "no gracias (asi estoy bien | no lo necesito)",
    ] },
    // --- questions about the medicine -----------------------------------------------------------------
    ask_dosage: { patterns: [
      "(como | cada cuanto) [@it] @tomo #h:how_take", "cada cuanto [tiempo] [@it] (se toma | se toman | tomo | me tomo) #h:how_often", "cuantas (tomo | pastillas tomo | me tomo | al dia | por dia | debo tomar | tabletas | pastillas) [al dia | por dia] #h:how_many",
      "(cual es | que) la dosis", "que dosis (tomo)?", "cuantas veces al dia", "como se (usa | aplica | pone) #h:how_use", "como (lo | la)? (uso | aplico | me pongo | me lo pongo | me la pongo)",
      "(me dice | me explica | me puede decir) como (tomarlo | tomarla | se toma | usarlo | usarla | se usa)", "cuanto (tomo | me tomo | le doy)", "cada cuantas horas", "cada cuanto [tiempo]", "cuantas [pastillas | tabletas | capsulas]", "y (la dosis | como se toma)",
      "(como | cada cuanto) se lo doy", "(y)? la dosis",
    ] },
    ask_drowsy: { patterns: [
      "(da | me da | me va a dar | causa | provoca | da mucho) sueno #h:q_drowsy", "(me | lo) (duerme | adormece)", "(puedo | se puede) manejar [con esto | si lo tomo | si la tomo | despues]", "(da | me da | me va a dar | causa) sueno [es que | porque] tengo que manejar",
      "(da | causa) somnolencia", "no (da | causa) sueno", "(es | no es)? de los que dan sueno",
    ] },
    ask_rx_needed: { patterns: [
      "(necesito | se necesita | ocupo | hace falta | pide | piden | requiere | lleva) receta #h:q_rx", "(es | se vende | lo venden | la venden) (con | sin) receta", "(lo | la) puedo comprar sin receta",
      "no (necesito | se necesita) receta", "es (controlado | controlada)",
      "(necesito | se necesita | ocupo | hace falta | piden) receta (para | con) [el | la | los | las] {product}", "[el | la] {product} (necesita | lleva | requiere | pide) receta",
      "(se vende | venden | puedo comprar) [el | la] {product} sin receta",
    ] },
    ask_food: { patterns: [
      "[@it] (tomo | tengo que tomar | me tomo | se toma) con (comida | alimentos | el estomago lleno) #h:q_food", "(antes | despues) de comer o (antes | despues)", "(con | sin) (comida | alimentos)",
      "(lo | la)? puedo tomar (en ayunas | con el estomago vacio | sin comer)", "[@it] (tomo | me tomo | se toma) (antes | despues) o (antes | despues) de (comer | los alimentos)",
      "(antes | despues) o (despues | antes) de (comer | los alimentos)", "tengo que comer (algo)? antes", "(antes | despues) de (comer | los alimentos)",
    ] },
    ask_alcohol: { patterns: [
      "(puedo | se puede) (tomar | beber) (alcohol | cerveza | una cerveza | vino | tequila | mezcal | unas cervezas | chelas | una chela | una copa) [con esto | con eso | con el medicamento | si lo tomo | si la tomo] #h:q_alcohol",
      "(y)? (el | con) alcohol", "(hay | hace) (problema | mal) con (el)? alcohol", "(se puede | puedo) (tomar | beber) (alcohol | cerveza)",
    ] },
    ask_kids: { patterns: [
      // ("Es para mi hijo" says who it's for: who_ans; "¿Es para niños?" asks)
      "(sirve | se puede dar | lo puede tomar | la puede tomar) para @kid #h:q_kids", "es para (un nino | una nina | ninos | los ninos | un bebe | bebes | ninos chiquitos)", "(lo | la)? puede tomar @kid",
      "(se lo | se la) puedo dar a @kid", "(tiene | hay) (para ninos | infantil | version infantil | presentacion infantil)",
      "(es | sirve) para (ninos | niños)", "y para @kid [de {n:number} anos]", "para (ninos | niños | bebes | un bebe | un nino | una nina)",
      // a cream or a spray: "¿Se le puede poner a los niños?"
      "(se le | se les | se lo | se la) puede (poner | dar | usar) [a] @kid", "(lo | la) puedo (poner | usar) (en | a) @kid", "(lo | la)? pueden usar @kid", "(es | sirve) (apto | apta) para @kid",
    ] },
    ask_side_effects: { patterns: ["(tiene | causa | da) (efectos secundarios | algun efecto secundario | contraindicaciones | reacciones)", "(hace | es) (dano | malo) (al | para el) (estomago | higado | rinon)", "es (fuerte | seguro)"] },
    ask_how_long_take: { patterns: [
      "(por | durante)? cuantos dias (lo | la)? (tomo | tengo que tomar | me lo tomo)", "(por | durante)? cuanto tiempo (lo | la)? (tomo | tengo que tomar | me lo tomo)", "hasta cuando (lo | la)? (tomo | me lo tomo)",
      "(por | durante) cuanto tiempo",
    ] },
    // "¿Cuánto cuesta?": a price question never pays (rule 17)
    ask_price: { patterns: [
      "cuanto (cuesta | es | sale | vale | le debo | seria | va a ser | cuestan | salen) #h:q_price", "cuanto (cuesta | sale | vale | cuestan) [el | la | los | las] {product}", "(que | cual es el) precio (tiene)? [el | la] [{product}]?",
      "a como (esta | sale | da | dan) [el | la | los | las] [{product}]", "cuanto le debo", "cuanto seria (todo | en total)",
    ] },
    // "¿Es muy caro?" (a question) gets the price; "Está muy caro" asks for something cheaper
    ask_cheaper: { patterns: [
      "(tiene | hay | tienen) (algo | uno | una | otro | otra | alguno)? mas (barato | barata | economico | economica) #h:q_cheaper", "(tiene | hay) (generico | genericos | el generico | algun generico) #h:q_generic", "no (tiene | hay) (generico | genericos)",
      "(es | esta) (muy | un poco | algo)? (caro | cara) #caro", "(no)? (tiene | hay) (algo)? mas (barato | economico)",
    ] },
    ask_where: { patterns: ["(donde | en donde) (esta | estan | tiene | tienen | encuentro | hay | queda) [el | la | los | las] {product} #h:q_where", "(donde | en donde) (estan | tienen) (las medicinas | los medicamentos)"] },
    no_rx_paper: { patterns: [
      "no (tengo | traigo) [la | una | mi] receta #h:no_rx", "no (la | lo) traigo", "sin receta", "se me olvidó (la receta | traer la receta)", "(no | no la) traje [la receta]",
      "(la receta | mi receta) (no la tengo | no la traigo | se me olvidó)", "no tengo receta (medica | del doctor)",
      "(la | lo) (dejé | olvidé) [en el hotel | en la casa | en casa | en el cuarto | en el carro]", "se me quedó [la receta] [en el hotel | en la casa | en casa | en el cuarto]", "(dejé | olvidé) la receta [en el hotel | en la casa | en casa | en el cuarto]",
    ] },
    more_no: { patterns: [
      "(es | eso es | eso seria | seria | eso es todo) todo #h:more_no", "(nada mas | solo | nomas) eso", "eso es todo", "por ahora es todo", "ya con eso", "con eso (es suficiente | esta bien)?", "no necesito nada mas",
      "no gracias es todo", "eso nada mas", "es todo gracias", "nada mas", "no (quiero | necesito) nada mas", "no gracias nada mas", "ya es todo",
    ] },
    // --- paying (as at the gas station) ---------------------------------------------------------------
    pay_card: { patterns: [
      "(puedo | se puede) pagar con tarjeta #h:pay_card", "con tarjeta #h:pay_card_short", "tarjeta", "(acepta | aceptan | toman | reciben) tarjeta #h:take_cards",
      "(tiene | tienen | hay) terminal", "(puedo | se puede) pagar con terminal",
      "(pago | voy a pagar | le pago) con tarjeta", "con (tarjeta)? de (credito | debito)", "con (la | mi) tarjeta", "aqui (tiene | esta) mi tarjeta",
      "(visa | mastercard | american express | amex)", "(me cobra | cobrese | me puede cobrar | cobreme) con tarjeta", "(aceptais | acepteis) tarjeta",
    ] },
    no_cash: { patterns: ["no (tengo | traigo) [suficiente] efectivo", "sin efectivo", "no (tengo | traigo) (cash | dinero en efectivo | pesos)", "no puedo pagar en efectivo"] },
    no_card: { patterns: ["no (tengo | traigo) tarjeta", "no (pago | puedo pagar | quiero pagar) con tarjeta", "sin tarjeta"] },
    pay_cash: { patterns: ["[puedo] pagar en efectivo", "en efectivo #h:pay_cash", "efectivo", "(pago | voy a pagar | le pago) en efectivo", "con efectivo", "(tarjeta | con tarjeta) no [mejor] en efectivo",
      "(mejor | prefiero) [pagar] (en | con) efectivo"] },
    pay_phone: { patterns: [
      "(puedo | se puede) pagar con (el | mi)? (celular | telefono) #h:pay_phone", "(pago | le pago) con (el | mi) (celular | telefono)", "con (el | mi) celular",
      "(acepta | aceptan | puedo pagar con) (apple pay | google pay)", "con (apple pay | google pay)",
    ] },
    here_you_go: { patterns: [
      "aqui tiene #h:here_you_go", "aqui esta", "tenga", "tome", "(aqui tiene | tenga | tome | le doy | aqui le doy) [son] {price}", "(aqui (tiene | esta) | tenga | tome) (otros | los otros) {price}", "aqui (tiene | estan) (los | sus) {price}", "(le pago | pago) con (un billete de)? {price}",
      "(aqui tiene | aqui le doy | tenga | tome | le doy) un billete de {price}",
    ] },
    // side questions at the counter (audit 5 Nov): dollars, the receipt, the hours
    ask_dollars: { patterns: [
      "(acepta | aceptan | toma | toman | recibe | reciben) (dolares | dolar | dolares americanos)", "(puedo | se puede) pagar (en | con) dolares", "(pago | le pago | le puedo pagar) (en | con) dolares",
      "(solo | nada mas | nomas)? (tengo | traigo) (dolares | puros dolares)", "(y)? (en | con) dolares", "aceptais dolares",
    ] },
    ask_receipt: { patterns: [
      "(me da | me puede dar | me podria dar | deme | me das #tip:tu_staff | quiero | necesito) (el | un | mi | su)? (ticket | recibo | comprobante | nota) [para el seguro | para mi seguro]",
      "(y)? (el | mi) (ticket | recibo | comprobante)", "(me da | me puede dar) (el | un)? (ticket | recibo | comprobante) de (compra | la compra)",
    ] },
    ask_hours: { patterns: [
      "a que hora (cierran | cierra | abren | abre)", "(hasta | desde) que hora (abren | estan abiertos | atienden | esta abierto | abre)", "(cual es | que) [el]? horario [tienen | tiene]",
      "(abren | estan abiertos | esta abierto | abre) (los domingos | todos los dias | manana | el domingo | (en | por) la noche)", "(cierran | cierra) (tarde | temprano)",
    ] },
    no_bag: { patterns: ["no (necesito | quiero) [una] (bolsa | bolsita) #h:no_bag", "sin bolsa", "(traigo | tengo) (mi | una)? bolsa", "(asi | asi esta) bien sin bolsa", "(bolsa | bolsita) no [gracias]"] },
    bag_yes: { patterns: ["si (una)? (bolsa | bolsita)", "(me da | deme | me puede dar) (una)? (bolsa | bolsita)", "(una)? (bolsa | bolsita) (por favor)?"] },
    // --- the prescription ----------------------------------------------------------------------------
    rx_pickup: { patterns: [
      "vengo a surtir (una | mi | esta | la)? receta #h:rx_fill", "vengo (con | a por) (una | mi | esta | la) receta", "vengo [a] por (lo | las pastillas | unas pastillas | el medicamento | la medicina | las medicinas) de (la | mi | esta) receta", "(traigo | tengo) (una | la | esta | mi)? receta [del doctor | de la doctora | medica | del medico] #h:rx_have",
      "(me puede | puede | me podria | podria)? surtir (esta | una | mi | la)? receta", "(me | le) (surte | surten) (esta | una | la)? receta", "(quiero | necesito) surtir (una | esta | mi)? receta",
      "(el doctor | la doctora | el medico | la medica) me (recetó | dio) (esto | esta medicina | este medicamento | algo | {product} | una receta)", "me (recetaron | dieron una receta para) (esto | {product} | un antibiotico)",
      "(tiene | tienen) (lo de)? esta receta", "(tiene | tienen) (este | esta) (medicamento | medicina) [de la receta]", "vengo (por | con) (una | mi)? receta [medica] #h:rx_fill", "(es | traigo) una receta medica",
      "(tengo | traigo) (una | la)? receta (para | de) {product}", "[pero] (si)? (tengo | traigo) (la | una | mi)? receta (aqui | conmigo)", "pero (tengo | traigo) (la | una | mi)? receta",
    ] },
    hand_over: { patterns: [
      "(aqui | aca) (tiene | esta) (la | mi | su)? receta #h:here_rx", "esta es (la | mi) receta", "(tome | tenga) (la | mi)? receta", "(se la | aqui se la) (doy | paso | muestro | enseno)",
      "(aqui | aca) (tiene | esta) [la | mi] receta (del doctor | de la doctora)",
    ] },
    // a bare "Aquí está" / "Tenga" only when he asked for the prescription (rule 12)
    hand_over_ctx: { patterns: ["(aqui | aca) (tiene | esta)", "tenga", "tome", "si aqui (esta | tiene)", "(si)? (claro)? (aqui | aca) la tiene"] },
    // --- brand-name or generic -------------------------------------------------------------------------
    generic_ans: { patterns: [
      "(el | la | uno | una)? (generico | generica) #gen #h:generic", "[el | la] de patente #pat #h:patent", "(el | la)? (original | de marca) #pat", "(el | la)? (mas barato | mas barata | mas economico | mas economica) #gen",
      "(deme | quiero | prefiero | mejor | me da) (el | la)? (generico | generica) [mejor] #gen", "(deme | quiero | prefiero | mejor | me da) (el | la)? de patente [mejor] #pat", "(deme | quiero | prefiero | me da) (el | la)? (original | de marca) [mejor] #pat",
      // "No quiero el genérico": a verb after "no" is what it negates
      "no (quiero | me de | necesito) (el | la)? (generico | generica) #notgen", "no (quiero | me de | necesito) (el | la)? de patente #notpat",
      "[no] (el | la)? (generico | generica) no #notgen", "[no] (el | la)? de patente no #notpat",
      // "No, el genérico" (that one) and "No el genérico" (not that one) are the same words once the comma is gone:
      // he asks which (rule 10)
      "no (el | la)? (generico | generica) #amb", "no (el | la)? de patente #amb",
      // "No, mejor el genérico", "No, el de patente está bien": the correction is the answer
      "no [gracias] (mejor | prefiero | mejor deme | deme) (el | la)? (generico | generica) #gen", "no [gracias] (mejor | prefiero | mejor deme | deme) (el | la)? de patente #pat",
      "no [gracias] (el | la)? (generico | generica) esta bien #gen", "no [gracias] (el | la)? de patente esta bien #pat",
      "(el | la)? (generico | generica) no (mejor | sino) (el | la)? de patente #pat", "(el | la)? de patente no (mejor | sino) (el | la)? (generico | generica) #gen",
      // "Genérico no, de patente" and "Genérico, no de patente" fold to the same words: #amb asks again (rule 10)
      "(el | la)? (generico | generica) no (el | la)? de patente #amb", "(el | la)? de patente no (el | la)? (generico | generica) #amb",
      "(el | la)? (generico | generica) esta bien #gen", "(el | la)? de patente esta bien #pat",
    ] },
    generic_ctx: { patterns: ["(cualquiera | el que sea | la que sea | lo que sea | el que usted diga | la que usted diga | me da igual | da igual | el que me recomiende | la que me recomiende | como usted diga | no se cual | no se cual es mejor | usted digame)"] },
    // "Sí, cámbiemelo" only answers "¿Quiere el genérico, entonces?"
    switch_ctx: { patterns: ["[si] (cambiemelo | cambiemela | cambielo | cambiela | cambiamelo #tip:tu_staff) [por el generico | por la generica]"] },
    generic_q: { patterns: [
      "(cual es | que) (la)? diferencia #diff #h:q_diff", "que diferencia hay #diff", "(es | son) (lo mismo | igual | iguales) #same", "(el generico | la generica) (es | funciona | sirve) (igual | lo mismo) [de bueno]? #same",
      "(funciona | sirve) igual #same", "(cual | que) me recomienda #which", "(cual | que) es mejor #which", "(cual | que) (seria | es) mejor #which", "cuanto (cuesta | sale | cuestan) cada (uno | una) #price", "cuanto (cuesta | sale) (el generico | la generica | el de patente | la de patente) #price",
      "(es | esta) (bueno | buena) el generico #same", "(cual | que) es (el | la)? mas (barato | barata | economico | economica) #price",
    ] },
    // --- the doctor next door --------------------------------------------------------------------------
    go_doctor: { patterns: [
      "(mejor | creo que)? (voy a ir | voy | paso | prefiero ir | quiero ir | quiero pasar | voy a pasar | prefiero pasar) (con | al) (el | la)? (doctor | medico | consultorio | doctora) #h:go_doctor",
      "(si)? (paso | quiero pasar | voy a pasar) con (el doctor | la doctora | el medico)", "(quiero | me gustaria | prefiero) que me (vea | revise) (un | el | la)? (doctor | medico | doctora)",
      "(puedo | se puede) (pasar con | ver a | ver al) (el | un | la)? (doctor | medico | doctora)", "(si)? voy (con el doctor | al consultorio)", "(si)? (paso | voy) al consultorio",
    ] },
    // "Sí, ¿dónde está?" only after "¿Quiere pasar con el doctor?"
    doctor_ctx: { patterns: ["[si] (donde | en donde) (esta | queda)", "[si] por donde"] },
    no_doctor: { patterns: ["no (quiero | voy a | necesito | tengo tiempo de) (ir | pasar) (al | con el | a ver al | con la) (doctor | medico | consultorio | doctora)", "(doctor | consultorio) no [gracias]", "no (quiero | necesito) (doctor | consulta | ver al doctor)", "sin doctor",
      "ya (fui | pasé | pase) (al | con el | con la) (doctor | medico | doctora | consultorio) #seen", "ya me (vio | revisó | reviso) (el | un | la) (doctor | medico | doctora) #seen"] },
    doctor_q: { patterns: [
      "cuanto (cuesta | es | sale | cobra) (la consulta | el doctor | la doctora | la consulta con el doctor) #price #h:q_consult", "(que | cual es el) precio (de | tiene) la consulta #price", "(es | sale) (cara | caro) la consulta #price",
      "(donde | en donde) (esta | queda) (el consultorio | el doctor | la doctora) #where #h:q_consult_where", "(hay | tienen | tiene) (un)? (doctor | medico | consultorio | doctora) [aqui | aqui cerca] #here",
      // (the doctor's hours need the doctor: a bare "¿A qué hora cierran?" asks about the pharmacy, ask_hours)
      "(esta | hay) (el doctor | doctor | la doctora) (ahorita | ahora | hoy)? #here", "a que hora (atiende | esta | llega | cierra | abre) (el doctor | el consultorio | la doctora | el medico) #hours",
      "a que hora (atiende | llega) #hours", "(hasta | desde) que hora (atiende | esta) (el doctor | la doctora | el medico) #hours",
      "(tengo que | hay que | necesito) (hacer | sacar) (una)? cita #cita", "(se necesita | necesito) cita #cita",
    ] },
    // --- dosage step answers ----------------------------------------------------------------------------
    no_questions: { patterns: ["no (tengo)? (ninguna)? pregunta[s]? #h:no_questions", "no ninguna", "(todo | ya) (claro | quedo claro | entendido)", "(ya | todo) (entendi | entendido)", "no (todo)? (esta)? claro", "ninguna [gracias]"] },
    // ("Más o menos" at "¿Sabe cómo se toma?" was taken as a how-are-you answer: "¡Ay, lo siento!")
    first_time: { patterns: ["(es | seria) la primera vez [que lo tomo | que la tomo]", "nunca [lo | la] he tomado", "no [lo | la] he tomado (nunca)?", "no se como (tomarlo | tomarla | se toma | se usa | usarlo | se toman)",
      "mas o menos", "no muy bien", "no (estoy | estoy muy) (seguro | segura)", "no me acuerdo [bien]", "no recuerdo [bien]", "mejor digame"] },
    not_first: { patterns: ["(ya | si) [lo | la] he tomado [antes]", "ya (lo | la) conozco", "(si | ya) se como (tomarlo | tomarla | se toma | se usa)", "(ya | si) (lo | la) tomé [antes]", "ya lo (he usado | usé)"] },
    know_ctx: { patterns: ["(si)? (ya)? se", "ya se como"] },
    // --- small talk and closing ----------------------------------------------------------------------
    thanks_help: { patterns: ["(muchas | mil)? gracias por (la ayuda | su ayuda | los consejos | el consejo | todo | la informacion) #h:thanks_help", "muy amable", "se lo agradezco", "(muchas)? gracias por (la ayuda | todo) (don hector)?"] },
    will_do_ctx: { patterns: ["(si)? (asi lo hare | lo hare | eso hare)", "(si)? (voy | iré) al doctor si (no se me quita | sigue | no mejoro)", "(ojala | eso espero)"] },
    help_me: { patterns: ["(me | le) (puede | podria) ayudar", "(tengo | una) pregunta", "le (puedo)? hacer una pregunta", "(necesito | ocupo) ayuda", "(una)? pregunta"] },
  },

  lines: {
    // --- greeting
    greet: [
      t("¡Buenas | tardes! | ¿Qué | le | damos?", "Good | afternoon! | What | (to) you | we-give?", "Good afternoon! What can I get you?"),
      t("¡Buenos días! | ¿En qué | le | puedo | ayudar?", "Good morning! | In what | (to) you | I-can | help?", "Good morning! How can I help you?"),
      t("¡Buenas! | Pásele. | ¿Qué | se le ofrece?", "Hi! | Come on in. | What | do you need?", "Hi, come on in! What can I do for you?",
        { flags: { 1: "Mexican: pásele = come in / go ahead." }, neutral: t("¡Buenas! | Pase. | ¿Qué | se le ofrece?", "Hi! | Come in. | What | do you need?", "Hi, come on in! What can I do for you?") }),
    ],
    greet_back: [t("¡Buenas | tardes! | ¿Qué | le | damos | hoy?", "Good | afternoon! | What | (to) you | we-give | today?", "Good afternoon! What can I get you today?")],
    greet_howareyou: [t("¡Buenos días! | ¿Cómo | está?", "Good morning! | How | are you?", "Good morning! How are you?")],
    ask_need: [
      t("¿En qué | le | puedo | ayudar?", "In what | (to) you | I-can | help?", "How can I help you?"),
      t("Dígame, | ¿qué | le | damos?", "Tell me, | what | (to) you | we-give?", "Go ahead, what can I get you?"),
    ],
    rx_prompt: [
      t("¡Buenas! | Qué | gusto | {m:verlo|f:verla} | otra vez. | ¿Viene | a | surtir | una | receta?", "Hi! | What | pleasure | to see you | again. | Are you coming | to | fill | a | prescription?",
        "Hi! Good to see you again. Are you here to fill a prescription?", { flags: { 3: "lo/la: “you”, for a man or a woman (usted).", 7: "Mexican: surtir una receta = to fill a prescription." },
          neutral: t("¡Buenas! | Qué | gusto | {m:verlo|f:verla} | otra vez. | ¿Viene | con | una | receta?", "Hi! | What | pleasure | to see you | again. | Are you coming | with | a | prescription?",
            "Hi! Good to see you again. Are you here with a prescription?", { flags: { 3: "lo/la: “you”, for a man or a woman (usted)." } }), spain: t("¡Buenas! | Me alegro | de | {m:verlo|f:verla} | otra vez. | ¿Viene | con | una | receta?", "Hi! | I'm glad | of | to see you | again. | Are you coming | with | a | prescription?", "Hi! Good to see you again. Are you here with a prescription?", { flags: { 3: "lo/la: “you”, for a man or a woman (usted)." } }) }),
    ],
    rx_prompt_again: [t("¿Trae | alguna | receta?", "Are you bringing | any | prescription?", "Do you have a prescription with you?")],
    sorry_symptom: [
      t("¡Ay, | qué | mal!", "Oh, | how | bad!", "Oh, I'm sorry to hear that!"),
      t("¡Híjole! | Lo siento.", "Oh, no! | I'm sorry.", "Oh no, I'm sorry.",
        { flags: { 0: "Mexican: ¡híjole! = oh no! / wow!" }, neutral: t("¡Uy! | Lo siento.", "Oh! | I'm sorry.", "Oh no, I'm sorry.") }),
    ],
    ask_symptoms: [t("¿Qué | síntomas | tiene?", "What | symptoms | do you have?", "What symptoms do you have?")],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Ajá.", "Uh-huh.", "Uh-huh.")],
    ok: [t("Perfecto.", "Perfect.", "Perfect.")],
    ask_more: [
      t("¿Algo | más?", "Something | more?", "Anything else?"),
      t("¿Se le ofrece | algo | más?", "Do you need | something | more?", "Can I get you anything else?"),
    ],
    what_else: [t("¿Qué | más | le | doy?", "What | more | (to) you | I-give?", "What else can I get you?")],
    go_ahead: [t("Claro, | dígame.", "Sure, | tell me.", "Sure, go ahead.")],
    // --- his questions
    ask_who: [t("¿Es | para | usted?", "Is it | for | you?", "Is it for you?")],
    ask_who_q: [t("¿Para | quién | es?", "For | whom | is it?", "Who's it for?")],
    ask_howlong: [
      t("¿Desde | cuándo | se siente | así?", "Since | when | you-feel | like this?", "How long have you been feeling like this?"),
      t("¿Desde | cuándo | tiene | los | síntomas?", "Since | when | you-have | the | symptoms?", "How long have you had the symptoms?"),
    ],
    ask_when: [t("¿Y | desde | cuándo | tiene | los | síntomas?", "And | since | when | does (he/she) have | the | symptoms?", "And how long have they had the symptoms?")],
    ask_meds: [t("¿Está | tomando | algún | otro | medicamento?", "Are you | taking | any | other | medicine?", "Are you taking any other medication?")],
    ask_meds_other: [t("¿Y | está | tomando | algún | medicamento?", "And | is (he/she) | taking | any | medicine?", "And are they taking any medication?")],
    ask_meds_which: [t("¿Cuál?", "Which?", "Which one?")],
    ask_allergy: [t("¿Tiene | alergia | a | algún | medicamento?", "Do you have | allergy | to | any | medicine?", "Are you allergic to any medication?")],
    ask_allergy_other: [t("¿Y | tiene | alergia | a | algún | medicamento?", "And | does (he/she) have | allergy | to | any | medicine?", "And are they allergic to any medication?")],
    ask_allergy_which: [t("¿A | cuál?", "To | which?", "To what?")],
    rx_allergy_q: [t("¿Es | {m:alérgico|f:alérgica} | a | la | penicilina?", "Are you | allergic | to | — | penicillin?", "Are you allergic to penicillin?",
      { flags: { 3: "la: Spanish uses the article for a substance in general; English doesn't." } })],
    meds_ok: [t("Bien. | Con | eso | no hay | problema.", "Good. | With | that | there's no | problem.", "Okay. That's no problem.")],
    allergy_ok: [t("Muy | bien, | gracias | por | decirme.", "Very | good, | thanks | for | telling me.", "Okay, thanks for letting me know.")],
    // --- the recommendation
    rec: [
      t("Le | recomiendo | {X.np}.", "(To) you | I-recommend | {X.np}.", "I'd recommend {X.np}."),
      t("Para | eso, | le | puedo | dar | {X.np}.", "For | that, | (to) you | I-can | give | {X.np}.", "For that, I can give you {X.np}."),
    ],
    rec_q_lo: [t("¿Se lo | doy?", "It to you | I-give?", "Would you like it?")],
    rec_again_lo: [t("¿Entonces, | se lo | doy?", "So, | it to you | I-give?", "So, would you like it?"), t("¿Se lo | lleva, | entonces?", "It | you-take, | then?", "So, will you take it?")],
    rec_q_la: [t("¿Se la | doy?", "It to you | I-give?", "Would you like it?", { flags: { 0: "la: “it”, agreeing with a feminine noun (la loratadina)." } })],
    rec_again_la: [t("¿Entonces, | se la | doy?", "So, | it to you | I-give?", "So, would you like it?", { flags: { 1: "la: “it”, agreeing with a feminine noun (la loratadina)." } }), t("¿Se la | lleva, | entonces?", "It | you-take, | then?", "So, will you take it?", { flags: { 0: "la: “it”, agreeing with a feminine noun." } })],
    rec_q_los: [t("¿Se los | doy?", "Them to you | I-give?", "Would you like them?")],
    rec_again_los: [t("¿Entonces, | se los | doy?", "So, | them to you | I-give?", "So, would you like them?"), t("¿Se los | lleva, | entonces?", "Them | you-take, | then?", "So, will you take them?")],
    rec_q_las: [t("¿Se las | doy?", "Them to you | I-give?", "Would you like them?", { flags: { 0: "las: “them”, agreeing with a feminine plural noun (las pastillas)." } })],
    rec_again_las: [t("¿Entonces, | se las | doy?", "So, | them to you | I-give?", "So, would you like them?", { flags: { 1: "las: “them”, agreeing with a feminine plural noun (las pastillas)." } }), t("¿Se las | lleva, | entonces?", "Them | you-take, | then?", "So, will you take them?", { flags: { 0: "las: “them”, agreeing with a feminine noun." } })],
    rec_fornow: [t("Mientras, | para | los | síntomas, | le | puedo | dar | {X.np}.", "Meanwhile, | for | the | symptoms, | (to) you | I-can | give | {X.np}.",
      "In the meantime, I can give you {X.np} for the symptoms.")],
    rec_alt: [t("Si | prefiere, | también | tengo | {X.np}.", "If | you-prefer, | also | I-have | {X.np}.", "If you'd rather, I also have {X.np}.")],
    rec_nothing_else: [t("Para | eso, | es | lo que | le | puedo | recomendar.", "For | that, | it's | what | (to) you | I-can | recommend.", "For that, that's what I can recommend.")],
    rec_none: [t("Está bien, | como | guste.", "It's fine, | as | you-like.", "All right, whatever you prefer.")],
    switch_aceta: [t("Mejor | le | doy | paracetamol.", "Better | (to) you | I-give | acetaminophen.", "I'd rather give you acetaminophen.")],
    // (audit 5 Nov: said for an allergy to aspirin, ibuprofen, naproxen or "los antiinflamatorios"; it used to say
    // "Si es alérgico a la aspirina" whatever the learner was allergic to)
    nsaid_reason: [t("Con | esa | alergia, | mejor | no tome | antiinflamatorios.", "With | that | allergy, | better | don't take | anti-inflammatories.",
      "With that allergy, you'd better not take anti-inflammatories.", { flags: { 5: "antiinflamatorios: ibuprofen, aspirin, naproxen… (NSAIDs), which cross-react with that allergy." } })],
    bp_reason: [t("Con | la | presión | alta, | mejor | no tome | ibuprofeno.", "With | — | blood pressure | high, | better | don't take | ibuprofen.",
      "With high blood pressure, you'd better not take ibuprofen.", { flags: { 1: "la: no article in English here." } })],
    bp_reason_cold: [t("Con | la | presión | alta, | mejor | no tome | antigripales.", "With | — | blood pressure | high, | better | don't take | cold medicines.",
      "With high blood pressure, you'd better not take cold medicine.", { flags: { 1: "la: no article in English here.", 6: "Most cold medicines have a decongestant that raises blood pressure." } })],
    // heart, depression, sleeping or anxiety pills, a daily aspirin, a medicine the learner can't name (and, for the
    // cold medicine, diabetes or thyroid pills)
    mix_reason: [t("Por si acaso, | mejor | no tome | ibuprofeno.", "Just in case, | better | don't take | ibuprofen.",
      "Just to be safe, you'd better not take ibuprofen.", { flags: { 0: "por si acaso = just in case." } })],
    mix_reason_cold: [t("Por si acaso, | mejor | no tome | antigripales.", "Just in case, | better | don't take | cold medicines.",
      "Just to be safe, you'd better not take cold medicine.", { flags: { 3: "Cold medicines have a decongestant and an antihistamine that don't mix well with some medicines and conditions." } })],
    para_reason: [t("Con | esa | alergia, | mejor | no tome | paracetamol.", "With | that | allergy, | better | don't take | acetaminophen.",
      "With that allergy, you'd better not take acetaminophen.", { flags: { 5: "Cold medicines have acetaminophen in them too." } })],
    // (aspirin is never given to children or teenagers: Reye's syndrome)
    kids_aspirin: [t("La | aspirina | no es | para | niños; | para | ellos, | mejor | paracetamol.", "— | Aspirin | isn't | for | children; | for | them, | better | acetaminophen.",
      "Aspirin isn't for children; for them, acetaminophen is better.", { flags: { 0: "la: Spanish uses the article for a medicine in general; English doesn't.", 2: "Aspirin isn't given to children or teenagers (it can cause Reye's syndrome)." } })],
    // a cold medicine already has acetaminophen in it (a second symptom, or both asked for)
    cold_has_para: [t("El | antigripal | ya | trae | paracetamol; | con | eso | es | suficiente.", "The | cold medicine | already | brings | acetaminophen; | with | that | it's | enough.",
      "The cold medicine already has acetaminophen in it; that's enough.", { flags: { 3: "traer = to bring; of a product, “to have in it, to come with”." } })],
    cold_para_warn: [t("Ojo: | el | antigripal | ya | trae | paracetamol; | no los tome | juntos.", "Careful: | the | cold medicine | already | brings | acetaminophen; | don't take them | together.",
      "Careful: the cold medicine already has acetaminophen in it, so don't take them together.", { flags: { 0: "¡Ojo! (eye) = watch out / careful." } })],
    kids_formula: [t("Para | niños, | mejor | la | presentación | infantil, | en | jarabe.", "For | children, | better | the | version | children's, | in | syrup.",
      "For children, the children's version is better, the syrup.")],
    // --- the doctor next door
    long_time: [t("Eso | ya | es | mucho | tiempo.", "That | already | is | a lot of | time.", "That's quite a while.")],
    see_doctor_soon: [t("Mejor | que | {m:lo|f:la} | vea | un | doctor.", "Better | that | you | sees | a | doctor.", "You should have a doctor take a look.",
      { flags: { 2: "lo/la: “you”, for a man or a woman (usted)." } })],
    consultorio: [
      t("Aquí al lado | tenemos | consultorio: | el | doctor | {m:lo|f:la} | revisa | y, | si | hace falta, | le | da | la | receta.",
        "Right next door | we-have | doctor's office: | the | doctor | you | examines | and, | if | it's needed, | (to) you | gives | the | prescription.",
        "We have a doctor's office right next door: the doctor can examine you and give you a prescription if you need one.",
        { flags: { 2: "A consultorio next to the pharmacy is very common in Mexico: a cheap visit, no appointment.", 5: "lo/la: “you”, for a man or a woman (usted)." } }),
    ],
    antibiotic_rx: [t("Los | antibióticos | solo | se venden | con | receta.", "— | Antibiotics | only | are sold | with | prescription.", "Antibiotics are only sold with a prescription.",
      { flags: { 0: "los: Spanish uses the article for things in general; English doesn't.", 5: "In Mexico antibiotics need a doctor's prescription; the pharmacy stamps or keeps it." } })],
    doctor_ask: [t("¿Quiere | pasar | con | el | doctor?", "Do you want | to go in | with | the | doctor?", "Would you like to see the doctor?")],
    doctor_ask_again: [t("¿Entonces, | pasa | con | el | doctor?", "So, | you-go in | with | the | doctor?", "So, will you see the doctor?")],
    go_doctor_ok: [
      t("Pásele, | es | la | puerta | de al lado.", "Go ahead, | it's | the | door | next door.", "Go right ahead, it's the next door over.",
        { flags: { 0: "Mexican: pásele = go ahead / come in." },
          neutral: t("Pase, | es | la | puerta | de al lado.", "Go ahead, | it's | the | door | next door.", "Go right ahead, it's the next door over.") }),
    ],
    doc_price: [t("Es | barata: | unos | sesenta | pesos.", "It's | cheap: | about | sixty | pesos.", "It's cheap, about sixty pesos.", { flags: { 2: "unos + a number = about." } })],
    doc_where: [t("Es | la | puerta | de al lado.", "It's | the | door | next door.", "It's the next door over.")],
    doc_here: [t("Sí, | el | doctor | está | ahorita.", "Yes, | the | doctor | is in | right now.", "Yes, the doctor's in right now.",
      { flags: { 4: "Mexican: ahorita = right now." }, neutral: t("Sí, | el | doctor | está | ahora.", "Yes, | the | doctor | is in | now.", "Yes, the doctor's in right now.") })],
    doc_hours: [t("Atiende | todos | los | días, | hasta | la | noche.", "He-sees patients | all | the | days, | until | the | night.", "He sees patients every day, until the evening.")],
    doc_cita: [t("No hace falta | cita: | llega | y | espera | su | turno.", "It's not needed | appointment: | you-arrive | and | you-wait | your | turn.",
      "You don't need an appointment: just come in and wait your turn.")],
    doctor_bye: [t("Con | la | receta, | aquí | {m:lo|f:la} | espero.", "With | the | prescription, | here | you | I-wait for.", "Come back with the prescription and I'll fill it for you.",
      { flags: { 4: "lo/la: “you”, for a man or a woman (usted)." } })],
    // --- products
    product_ok: [t("Claro.", "Sure.", "Sure."), t("Con gusto.", "Gladly.", "Sure thing.", { spain: t("Ahora mismo.", "Right away.", "Sure thing.") })],
    qty_two: [t("Claro, | dos.", "Sure, | two.", "Sure, two.")],
    qty_three: [t("Claro, | tres.", "Sure, | three.", "Sure, three.")],
    paid_already: [t("Eso | ya | está | pagado.", "That | already | is | paid.", "That's already paid for.")],
    here_it_is: [t("Aquí tiene.", "Here you go.", "Here you go."), t("Aquí está.", "Here it is.", "Here it is.")],
    // (pastillas, curitas: never "Aquí está")
    here_pl: [t("Aquí tiene.", "Here you go.", "Here you go.")],
    where_it_is: [t("Todo | está | aquí | atrás | del | mostrador; | yo | se lo | doy.", "Everything | is | here | behind | the | counter; | I | it to you | give.",
      "Everything's back here behind the counter; I'll get it for you.", { spain: t("Todo | está | aquí | detrás | del | mostrador; | yo | se lo | doy.", "Everything | is | here | behind | the | counter; | I | it to you | give.", "Everything's back here behind the counter; I'll get it for you.") })],
    unknown_product: [t("Ese | medicamento | solo | se vende | con | receta | médica.", "That | medicine | only | is sold | with | prescription | medical.", "That medicine is only sold with a doctor's prescription.")],
    // --- brand-name or generic
    // "de patente" (brand-name) is Mexican: the neutral text says "de marca" (audit 5 Nov)
    generic_q: [
      t("¿De patente | o | genérico?", "Brand-name | or | generic?", "Brand-name or generic?",
        { flags: { 0: "Mexican: de patente = the brand-name medicine (elsewhere: de marca); el genérico is the same substance, cheaper." },
          neutral: t("¿De marca | o | genérico?", "Brand-name | or | generic?", "Brand-name or generic?",
            { flags: { 0: "de marca = the brand-name medicine; el genérico is the same substance, cheaper." } }) }),
      t("¿Cuál | le | doy, | el | de patente | o | el | genérico?", "Which | (to) you | I-give, | the | brand-name one | or | the | generic?", "Which would you like, brand-name or generic?",
        { flags: { 4: "Mexican: de patente = the brand-name medicine (elsewhere: de marca); el genérico is the same substance, cheaper." },
          neutral: t("¿Cuál | le | doy, | el | de marca | o | el | genérico?", "Which | (to) you | I-give, | the | brand-name one | or | the | generic?", "Which would you like, brand-name or generic?",
            { flags: { 4: "de marca = the brand-name medicine; el genérico is the same substance, cheaper." } }) }),
    ],
    which_one: [t("Perdón, | ¿cuál | de | los | dos?", "Sorry, | which | of | the | two?", "Sorry, which of the two?")],
    switch_q: [t("¿Quiere | el | genérico, | entonces?", "Do you want | the | generic, | then?", "Do you want the generic, then?")],
    generic_again: [t("¿Entonces, | de patente | o | genérico?", "So, | brand-name | or | generic?", "So, brand-name or generic?",
      { neutral: t("¿Entonces, | de marca | o | genérico?", "So, | brand-name | or | generic?", "So, brand-name or generic?") })],
    generic_diff: [t("Es | la | misma | sustancia; | el | genérico | nada más | es | más | barato.", "It's | the | same | substance; | the | generic | just | is | more | cheap.",
      "It's the same active ingredient; the generic is just cheaper.", { spain: t("Es | la | misma | sustancia; | el | genérico | solo | es | más | barato.", "It's | the | same | substance; | the | generic | just | is | more | cheap.", "It's the same active ingredient; the generic is just cheaper.") })],
    generic_prices: [t("El | de patente | cuesta | {$price}, | y | el | genérico, | {$amount}.", "The | brand-name one | costs | {$price}, | and | the | generic, | {$amount}.",
      "The brand-name one is {$price}, and the generic is {$amount}.",
      { neutral: t("El | de marca | cuesta | {$price}, | y | el | genérico, | {$amount}.", "The | brand-name one | costs | {$price}, | and | the | generic, | {$amount}.",
        "The brand-name one is {$price}, and the generic is {$amount}.") })],
    generic_rec: [t("Yo | le | recomiendo | el | genérico: | funciona | igual.", "I | (to) you | recommend | the | generic: | it-works | the same.", "I'd go with the generic; it works just as well.")],
    gen_ok: [t("Muy | bien, | el | genérico. | Aquí tiene.", "Very | good, | the | generic. | Here you go.", "All right, the generic. Here you go.")],
    pat_ok: [t("Muy | bien, | el | de patente. | Aquí tiene.", "Very | good, | the | brand-name one. | Here you go.", "All right, the brand-name one. Here you go.",
      { neutral: t("Muy | bien, | el | de marca. | Aquí tiene.", "Very | good, | the | brand-name one. | Here you go.", "All right, the brand-name one. Here you go.") })],
    gen_ok_f: [t("Muy | bien, | la | genérica. | Aquí tiene.", "Very | good, | the | generic. | Here you go.", "All right, the generic. Here you go.",
      { flags: { 2: "la genérica: agrees with a feminine medicine (la loratadina)." } })],
    pat_ok_f: [t("Muy | bien, | la | de patente. | Aquí tiene.", "Very | good, | the | brand-name one. | Here you go.", "All right, the brand-name one. Here you go.",
      { flags: { 2: "la de patente: agrees with a feminine medicine (la loratadina)." },
        neutral: t("Muy | bien, | la | de marca. | Aquí tiene.", "Very | good, | the | brand-name one. | Here you go.", "All right, the brand-name one. Here you go.",
          { flags: { 2: "la de marca: agrees with a feminine medicine (la loratadina)." } }) })],
    gen_ok_rx: [t("Muy | bien, | la | genérica.", "Very | good, | the | generic.", "All right, the generic.", { flags: { 2: "la genérica: agrees with la amoxicilina." } })],
    pat_ok_rx: [t("Muy | bien, | la | de patente.", "Very | good, | the | brand-name one.", "All right, the brand-name one.", { flags: { 2: "la de patente: agrees with la amoxicilina." },
      neutral: t("Muy | bien, | la | de marca.", "Very | good, | the | brand-name one.", "All right, the brand-name one.", { flags: { 2: "la de marca: agrees with la amoxicilina." } }) })],
    rx_here: [t("Aquí tiene | su | medicina.", "Here you have | your | medicine.", "Here's your medicine.")],
    out_brand: [t("El | de patente | se me acabó, | pero | tengo | el | genérico: | es | lo mismo | y | más | barato.",
      "The | brand-name one | ran out on me, | but | I-have | the | generic: | it's | the same | and | more | cheap.",
      "I'm out of the brand-name one, but I have the generic: it's the same thing, and cheaper.",
      { neutral: t("El | de marca | se me acabó, | pero | tengo | el | genérico: | es | lo mismo | y | más | barato.",
        "The | brand-name one | ran out on me, | but | I-have | the | generic: | it's | the same | and | more | cheap.",
        "I'm out of the brand-name one, but I have the generic: it's the same thing, and cheaper.") })],
    cheaper_yes: [t("Sí, | el | genérico: | cuesta | {$price}.", "Yes, | the | generic: | it-costs | {$price}.", "Yes, the generic: it's {$price}.")],
    cheaper_already: [t("Ya | le | di | el | genérico: | es | lo | más | barato.", "Already | (to) you | I-gave | the | generic: | it's | the | most | cheap.", "I already gave you the generic; it's the cheapest.")],
    cheaper_none: [t("Es | lo | más | económico | que | tengo.", "It's | the | most | economical | that | I-have.", "That's the cheapest I have.")],
    // --- how to take it
    ask_questions: [t("¿Sabe | cómo | se toma?", "Do you know | how | it's taken?", "Do you know how to take it?")],
    ask_questions_pl: [t("¿Sabe | cómo | se toman?", "Do you know | how | they're taken?", "Do you know how to take them?")],
    ask_use: [t("¿Sabe | cómo | se usa?", "Do you know | how | it's used?", "Do you know how to use it?")],
    questions_q: [t("¿Tiene | alguna | pregunta?", "Do you have | any | question?", "Any questions?")],
    dose_first: [t("Primero | vemos | qué | le | conviene.", "First | we-see | what | (to) you | suits.", "Let's first see what's right for you.")],
    dose_reminder: [t("Muy | bien. | Nada más | le | recuerdo:", "Very | good. | Just | (to) you | I-remind:", "Okay. Just a reminder:", { spain: t("Muy | bien. | Solo | le | recuerdo:", "Very | good. | Just | (to) you | I-remind:", "Okay. Just a reminder:") })],
    dose_ibuprofen: [t("Una | tableta | cada | ocho | horas, | después de | comer.", "One | tablet | every | eight | hours, | after | eating.", "One tablet every eight hours, after eating.")],
    max_three: [t("No tome | más | de | tres | al | día.", "Don't take | more | than | three | a | day.", "Don't take more than three a day.")],
    dose_paracetamol: [t("Una | o | dos | tabletas | cada | ocho | horas.", "One | or | two | tablets | every | eight | hours.", "One or two tablets every eight hours.")],
    dose_aspirin: [t("Una | o | dos | tabletas | cada | seis | horas, | con | alimentos.", "One | or | two | tablets | every | six | hours, | with | food.", "One or two tablets every six hours, with food.")],
    max_six: [t("No tome | más | de | seis | al | día.", "Don't take | more | than | six | a | day.", "Don't take more than six a day.")],
    dose_syrup: [t("Una | cucharada | cada | ocho | horas.", "One | spoonful | every | eight | hours.", "One tablespoon every eight hours.")],
    syrup_cup: [t("Trae | un | vasito | para | medir.", "It-comes with | a | little cup | to | measure.", "It comes with a little measuring cup.",
      { flags: { 0: "traer = to bring; of a product, “to come with”." } })],
    dose_lozenges: [t("Una | pastilla | cada | tres | horas; | déjela | deshacerse | en | la | boca.", "One | lozenge | every | three | hours; | let it | dissolve | in | your | mouth.",
      "One every three hours; let it dissolve in your mouth.", { flags: { 8: "la boca: Spanish says “the mouth” where English says “your”." } })],
    max_eight: [t("No | más | de | ocho | al | día.", "Not | more | than | eight | a | day.", "No more than eight a day.")],
    dose_cold: [t("Una | cápsula | cada | ocho | horas.", "One | capsule | every | eight | hours.", "One capsule every eight hours.")],
    cold_drowsy: [t("Ojo: | da | sueño; | mejor | no maneje | después.", "Careful: | it-causes | sleepiness; | better | don't drive | afterwards.",
      "Careful, it makes you drowsy, so better not drive afterwards.", { flags: { 0: "¡Ojo! (eye) = watch out / careful." }, spain: t("Ojo: | da | sueño; | mejor | no conduzca | después.", "Careful: | it-causes | sleepiness; | better | don't drive | afterwards.", "Careful, it makes you drowsy, so better not drive afterwards.", { flags: { 0: "¡Ojo! (eye) = watch out / careful." } }) })],
    dose_allergy: [t("Una | tableta | al | día.", "One | tablet | a | day.", "One tablet a day.")],
    allergy_nondrowsy: [t("Y | no da | sueño.", "And | it doesn't cause | sleepiness.", "And it won't make you drowsy.")],
    dose_antacid: [t("Mastique | una | o | dos | tabletas | cuando | sienta | las | agruras.", "Chew | one | or | two | tablets | when | you-feel | — | heartburn.",
      "Chew one or two tablets when you feel heartburn.", { flags: { 7: "las: no article in English here.", 8: "Mexican: agruras = heartburn. Elsewhere: acidez." },
        neutral: t("Mastique | una | o | dos | tabletas | cuando | sienta | acidez.", "Chew | one | or | two | tablets | when | you-feel | heartburn.", "Chew one or two tablets when you feel heartburn.") })],
    antacid_after: [t("Funciona | mejor | después de | comer.", "It-works | better | after | eating.", "It works best after a meal.")],
    dose_serum: [t("Tómeselo | a | traguitos, | durante | el | día.", "Drink it | in | little sips, | during | the | day.", "Sip it slowly throughout the day.")],
    serum_water: [t("Y | tome | mucha | agua. | Si | en | dos | días | sigue | igual, | vaya | al | doctor.", "And | drink | a lot of | water. | If | in | two | days | you-continue | the same, | go | to the | doctor.",
      "And drink plenty of water. If you're no better in two days, see a doctor.")],
    dose_aloe: [t("Póngaselo | varias | veces | al | día | en | la | piel | quemada.", "Put it on | several | times | a | day | on | the | skin | burned.", "Put it on the burned skin several times a day.")],
    aloe_sun: [t("Y | no se asolee | unos | días.", "And | don't get sun | some | days.", "And stay out of the sun for a few days.")],
    dose_sunscreen: [t("Póngaselo | media | hora | antes de | salir, | y | otra vez | cada | dos | horas.", "Put it on | half | hour | before | going out, | and | again | every | two | hours.",
      "Put it on half an hour before you go out, and again every two hours.")],
    sunscreen_reef: [t("Es | biodegradable: | no le hace | daño | al | arrecife.", "It's | biodegradable: | it doesn't do | harm | to the | reef.", "It's biodegradable, so it won't harm the reef.")],
    dose_itch: [
      t("Póngasela | en | los | piquetes | dos | o | tres | veces | al | día.", "Put it on | on | the | bites | two | or | three | times | a | day.", "Put it on the bites two or three times a day.",
        { flags: { 3: "piquete = a bite or sting (Mexico); elsewhere: picadura." },
          neutral: t("Póngasela | en | las | picaduras | dos | o | tres | veces | al | día.", "Put it on | on | the | bites | two | or | three | times | a | day.", "Put it on the bites two or three times a day.") }),
    ],
    itch_noscratch: [t("Y | no se rasque.", "And | don't scratch.", "And try not to scratch.")],
    dose_repellent: [t("Póngaselo | en | la | piel | antes de | salir.", "Put it on | on | the | skin | before | going out.", "Put it on your skin before you go out.")],
    repellent_dusk: [
      t("Los | moscos | pican | más | al | atardecer.", "The | mosquitoes | bite | more | at | dusk.", "Mosquitoes bite most at dusk.",
        { flags: { 1: "Mexican: moscos = mosquitoes. Elsewhere: mosquitos." },
          neutral: t("Los | mosquitos | pican | más | al | atardecer.", "The | mosquitoes | bite | more | at | dusk.", "Mosquitoes bite most at dusk.") }),
    ],
    dose_vitamins: [t("Una | tableta | al | día, | con | el | desayuno.", "One | tablet | a | day, | with | — | breakfast.", "One tablet a day, with breakfast.",
      { flags: { 5: "el: English says “with breakfast”, no article." } })],
    no_dose: [t("Las | curitas | no tienen | ciencia.", "The | Band-Aids | don't have | science.", "There's nothing tricky about Band-Aids.",
      { flags: { 2: "no tener ciencia = to be simple, nothing to it." } })],
    kids_dose: [t("Para | niños, | la | dosis | va | según | el | peso; | viene | en | la | caja.", "For | children, | the | dose | goes | according to | the | weight; | it-comes | on | the | box.",
      "For children, the dose depends on their weight; it's on the box.")],
    // creams, sunscreen, bug spray: for children too, from an age the label gives (none for babies)
    kids_skin: [t("Sí, | también | es | para | niños; | en | la | etiqueta | dice | desde | qué | edad.", "Yes, | also | it's | for | children; | on | the | label | it-says | from | what | age.",
      "Yes, it's for children too; the label says from what age.")],
    kids_ok: [t("Claro.", "Sure.", "Sure.")],
    // the prescription (amoxicillin)
    rx_ask: [
      t("Claro. | ¿Me | permite | la | receta?", "Sure. | (To) me | you-allow | the | prescription?", "Sure. May I see the prescription?"),
      t("Con gusto. | ¿Me | deja | ver | la | receta?", "Gladly. | (To) me | you-let | see | the | prescription?", "Of course. Can I see the prescription?", { spain: t("Claro. | ¿Me | deja | ver | la | receta?", "Sure. | (To) me | you-let | see | the | prescription?", "Of course. Can I see the prescription?") }),
    ],
    rx_ask_again: [t("¿Me | permite | la | receta, | por favor?", "(To) me | you-allow | the | prescription, | please?", "Could I see the prescription, please?")],
    // (five days, as Doctora Herrera prescribes it in s31: "una cápsula cada ocho horas… por cinco días")
    rx_read: [t("A ver… | Amoxicilina | de | quinientos: | una | cápsula | cada | ocho | horas, | por | cinco | días.",
      "Let's see… | Amoxicillin | of | five hundred: | one | capsule | every | eight | hours, | for | five | days.",
      "Let's see… Amoxicillin, 500 milligrams: one capsule every eight hours for five days.", { flags: { 3: "quinientos: 500 milligrams." } })],
    rx_stamp: [t("Como | es | antibiótico, | tengo | que | sellar | la | receta.", "Since | it's | antibiotic, | I-have | to | stamp | the | prescription.",
      "Since it's an antibiotic, I have to stamp the prescription.", { flags: { 5: "In Mexico a pharmacy stamps a prescription for antibiotics when it fills it (and may keep it)." } })],
    rx_finish: [t("Tómesela | toda, | aunque | se sienta | mejor.", "Take it | all, | even if | you-feel | better.", "Take all of it, even if you feel better.")],
    rx_need_paper: [t("Sin | receta | no puedo | vendérsela.", "Without | prescription | I can't | sell it to you.", "I can't sell it to you without the prescription.")],
    rx_pen: [t("Entonces | no puedo | dársela: | la | amoxicilina | es | una | penicilina. | Pídale | al | doctor | otro | antibiótico.",
      "Then | I can't | give it to you: | — | amoxicillin | is | a | penicillin. | Ask | to the | doctor | another | antibiotic.",
      "Then I can't give it to you: amoxicillin is a penicillin. Ask the doctor for a different antibiotic.", { flags: { 3: "la: no article in English for a medicine in general." } })],
    rx_food: [t("Puede | tomarla | con | o | sin | alimentos.", "You-can | take it | with | or | without | food.", "You can take it with or without food.")],
    rx_alcohol: [t("Nada | de | alcohol | mientras | tome | el | antibiótico.", "Nothing | of | alcohol | while | you-take | the | antibiotic.", "No alcohol while you're on the antibiotic.")],
    // --- answers about the medicine
    drowsy_no: [t("No, | no da | sueño.", "No, | it doesn't cause | sleepiness.", "No, it won't make you drowsy.")],
    drowsy_little: [t("Puede | dar | un poco | de | sueño.", "It-can | cause | a little | of | sleepiness.", "It can make you a little drowsy.")],
    drowsy_yes: [t("Sí, | da | sueño; | mejor | no maneje | después.", "Yes, | it-causes | sleepiness; | better | don't drive | afterwards.", "Yes, it makes you drowsy, so better not drive afterwards.", { spain: t("Sí, | da | sueño; | mejor | no conduzca | después.", "Yes, | it-causes | sleepiness; | better | don't drive | afterwards.", "Yes, it makes you drowsy, so better not drive afterwards.") })],
    rx_not_needed: [t("No, | se vende | sin | receta.", "No, | it's sold | without | prescription.", "No, it's sold without a prescription.")],
    rx_stronger: [t("Algo | más | fuerte | ya | necesita | receta.", "Something | more | strong | already | needs | prescription.", "Anything stronger needs a prescription.")],
    food_with: [t("Mejor | con | alimentos, | para | cuidar | el | estómago.", "Better | with | food, | to | protect | your | stomach.", "Better with food, to protect your stomach.", { flags: { 5: "el estómago: Spanish says “the stomach” where English says “your”." } })],
    food_after: [t("Mejor | después de | comer.", "Better | after | eating.", "Best after a meal.")],
    food_any: [t("Con | o | sin | alimentos, | da igual.", "With | or | without | food, | it doesn't matter.", "With or without food, it doesn't matter.")],
    alcohol_no: [t("Mejor | no tome | alcohol | con | este | medicamento.", "Better | don't drink | alcohol | with | this | medicine.", "Better not drink alcohol with this medicine.")],
    alcohol_skin: [t("Eso | es | para | la | piel; | no | hay | problema.", "That | is | for | the | skin; | no | there's | problem.", "That's for your skin, so there's no problem.")],
    // (also asked before he has said the dose: "la dosis que le dije" pointed at nothing)
    side_effects: [t("Con | la | dosis | correcta, | no debe | darle | problemas.", "With | the | dose | correct, | it shouldn't | give you | problems.",
      "At the right dose, it shouldn't give you any trouble.")],
    how_long_take: [t("Mientras | tenga | síntomas. | Si | en | tres | días | no mejora, | vaya | al | doctor.", "While | you-have | symptoms. | If | in | three | days | you don't improve, | go | to the | doctor.",
      "As long as you have symptoms. If you're not better in three days, see a doctor.")],
    kids_yes: [t("Para | niños | hay | presentación | infantil.", "For | children | there's | version | children's.", "There's a children's version.")],
    depends: [t("Depende | del | medicamento.", "It-depends | on the | medicine.", "It depends on the medicine.")],
    no_rx_ok: [t("No se preocupe: | para | esto | no necesita | receta.", "Don't worry: | for | this | you don't need | prescription.", "Don't worry, you don't need a prescription for this.")],
    // --- paying
    price_is: [t("Son | {$price}.", "That's | {$price}.", "It's {$price}.")],
    total: [
      t("En | total | son | {$price}.", "In | total | it's | {$price}.", "That's {$price} altogether."),
      t("Serían | {$price}.", "It would be | {$price}.", "That'll be {$price}."),
    ],
    ask_pay_method: [t("¿Efectivo | o | tarjeta?", "Cash | or | card?", "Cash or card?")],
    card_tap: [t("Acerque | su | tarjeta… | Listo, | ya | pasó.", "Bring close | your | card… | Done, | already | it-went-through.", "Tap your card… Done, it went through.", { spain: t("Acerque | su | tarjeta… | Ya está, | ya | ha | pasado.", "Bring close | your | card… | Done, | already | it-has | gone through.", "Tap your card… Done, it went through.") })],
    card_later: [t("Sí, | claro. | Al | final | le | cobro.", "Yes, | of course. | At the | end | (to) you | I-charge.", "Sure. I'll ring you up at the end.")],
    phone_ok: [t("Sí, | acérquelo | a | la | terminal… | Listo, | ya | pasó.", "Yes, | bring it close | to | the | card machine… | Done, | already | it-went-through.",
      "Sure, hold it up to the card machine… Done, it went through.", { spain: t("Sí, | acérquelo | al | datáfono… | Ya está, | ya | ha | pasado.", "Yes, | bring it close | to the | card machine… | Done, | already | it-has | gone through.", "Sure, hold it up to the card machine… Done, it went through.") })],
    cash_ok: [t("Claro, | en efectivo.", "Sure, | in cash.", "Sure, cash is fine.")],
    change_back: [t("Gracias. | Aquí tiene | su | cambio.", "Thanks. | Here's | your | change.", "Thanks. Here's your change.")],
    change_is: [t("Gracias. | Su | cambio: | {$price}.", "Thanks. | Your | change: | {$price}.", "Thanks. Your change is {$price}.")],
    // a bill short of the total (said just before): one amount, so every shortfall has its clip (the old line with
    // {$total} and {$price} was voiced only for the four pairs the random runs happened to say)
    short: [t("Perdón, | faltan | {$price}.", "Sorry, | they're-missing | {$price}.", "Sorry, you're {$price} short.", { flags: { 1: "faltan: “are missing”, the pesos still to pay." } })],
    pay_later: [t("En | un | momento | le | cobro.", "In | a | moment | (to) you | I-charge.", "I'll ring you up in a moment.")],
    no_problem: [t("No hay problema.", "No problem.", "No problem.")],
    no_dollars: [t("Solo | aceptamos | pesos, | pero | puede | pagar | con | tarjeta.", "Only | we-accept | pesos, | but | you-can | pay | with | card.", "We only take pesos, but you can pay by card.")],
    receipt_here: [t("Claro, | aquí tiene | su | ticket.", "Sure, | here's | your | receipt.", "Sure, here's your receipt.",
      { flags: { 3: "Mexican: ticket = a store receipt. Elsewhere: recibo." }, neutral: t("Claro, | aquí tiene | su | recibo.", "Sure, | here's | your | receipt.", "Sure, here's your receipt.") })],
    receipt_later: [t("Claro, | se lo | doy | cuando | pague.", "Sure, | it to you | I-give | when | you-pay.", "Sure, I'll give it to you when you pay.")],
    // the pharmacy's hours (the doctor next door: doc_hours)
    hours: [t("Abrimos | todos | los | días, | de | ocho | de la mañana | a | diez | de la noche.", "We-open | all | the | days, | from | eight | a.m. | to | ten | p.m.",
      "We're open every day, from 8 a.m. to 10 p.m.")],
    ask_bag: [t("¿Le | doy | una | bolsita?", "(To) you | I-give | a | little bag?", "Would you like a bag?", { flags: { 3: "bolsita: bolsa (bag) with the diminutive, very common in Mexico." } })],
    bag_here: [t("Aquí | va, | en | su | bolsita.", "Here | it-goes, | in | your | little bag.", "Here you go, in a bag.")],
    // --- goodbye
    feel_better: [t("¡Que | se mejore!", "That | you-get better!", "Feel better!"), t("¡Que | se alivie | pronto!", "That | you-get well | soon!", "I hope you feel better soon!", { spain: t("¡Que | se mejore | pronto!", "That | you-get better | soon!", "I hope you feel better soon!") })],
    see_doctor: [t("Si | no se le quita | en | unos | días, | vaya | al | doctor.", "If | it doesn't go away | in | some | days, | go | to the | doctor.", "If it doesn't go away in a few days, see a doctor.")],
    // for a child or another adult (vayan: the learner and the patient)
    see_doctor_other: [t("Si | no mejora | en | un | par | de | días, | vayan | al | doctor.", "If | (he/she) doesn't improve | in | a | couple | of | days, | go (both of you) | to the | doctor.",
      "If they're not better in a couple of days, take them to a doctor.")],
    closing_other: [t("¡Que | le | vaya | bien!", "That | (to) you | it-goes | well!", "Have a good one!")],
    closing_nobuy: [t("Cuando | guste, | aquí | estamos.", "Whenever | you-like, | here | we-are.", "We're here whenever you need us.")],
  },

  domains: {
    price: () => {
      const s = new Set<number>();
      for (let p = 500; p <= MAX_CASH; p += 500) s.add(p);
      return [...s];
    },
  },

  hints: {
    symptom: {
      lt: "Say what's wrong",
      items: [
        { id: "sym_hurts", s: t("Me duele | la | cabeza.", "Hurts (me) | the | head.", "I have a headache."), note: "me duele + the body part: “Me duele la garganta”, “Me duele el estómago”." },
        { id: "sth_for", s: t("¿Tiene | algo | para | la | tos?", "Do you have | something | for | the | cough?", "Do you have anything for a cough?") },
        { id: "sym_hurts", s: t("Me duele | la | garganta.", "Hurts (me) | the | throat.", "I have a sore throat.") },
        { id: "sym_have", s: t("Tengo | gripa.", "I-have | cold.", "I have a cold.", { flags: { 1: "Mexican: gripa = a cold or the flu. Elsewhere: gripe." }, neutral: t("Tengo | gripe.", "I-have | cold.", "I have a cold.") }),
          note: "Careful: in Mexico “estoy constipado” means constipated, not a cold." },
        { id: "sym_have", s: t("Tengo | fiebre.", "I-have | fever.", "I have a fever.") },
        { id: "sym_hurts", s: t("Me duele | el | estómago.", "Hurts (me) | the | stomach.", "I have a stomachache.") },
        { id: "sym_sun", s: t("Me quemé | con | el | sol.", "I-got burned | with | the | sun.", "I got sunburned.") },
        { id: "sym_bites", s: t("Me | picaron | los | moscos.", "(To) me | they-bit | the | mosquitoes.", "The mosquitoes bit me.",
          { flags: { 3: "Mexican: moscos = mosquitoes. Elsewhere: mosquitos." }, neutral: t("Me | picaron | los | mosquitos.", "(To) me | they-bit | the | mosquitoes.", "The mosquitoes bit me.") }) },
        { id: "what_take", s: t("¿Qué | me | recomienda | para | la | fiebre?", "What | (to) me | you-recommend | for | the | fever?", "What do you recommend for a fever?") },
        { id: "feel_sick", s: t("Me siento | mal.", "I-feel | bad.", "I don't feel well.") },
      ],
    },
    product: {
      lt: "Ask for a product", slot: "product", examples: ["sunscreen", "ibuprofen", "repellent"],
      items: [
        { id: "prod_have", s: t("¿Tiene | {X}?", "Do you have | {X}?", "Do you have {X}?") },
        { id: "prod_give", s: t("¿Me | da | {X.np}, | por favor?", "(To) me | you-give | {X.np}, | please?", "Can I have {X.np}, please?"), note: "Very common in Mexico: “¿Me da…?”" },
      ],
    },
    rx: {
      lt: "Fill a prescription",
      items: [
        { id: "rx_fill", s: t("Vengo | a | surtir | una | receta.", "I-come | to | fill | a | prescription.", "I'm here to fill a prescription.",
          { flags: { 2: "Mexican: surtir una receta = to fill a prescription." },
            neutral: t("Vengo | con | una | receta.", "I-come | with | a | prescription.", "I'm here with a prescription.") }),
          note: "In Mexico you “surten” a prescription (fill it): “Vengo a surtir una receta”. Anywhere: “Vengo con una receta”." },
        { id: "rx_have", s: t("Traigo | una | receta | del | doctor.", "I-bring | a | prescription | from the | doctor.", "I have a prescription from the doctor.") },
        { id: "here_rx", s: t("Aquí está | la | receta.", "Here is | the | prescription.", "Here's the prescription.") },
        { id: "no_rx", s: t("No tengo | receta.", "I don't have | prescription.", "I don't have a prescription.") },
      ],
    },
    who: {
      lt: "Say who it's for",
      items: [
        { id: "for_me", s: t("Sí, | es | para | mí.", "Yes, | it's | for | me.", "Yes, it's for me.") },
        { id: "for_child", s: t("Es | para | mi | hijo.", "It's | for | my | son.", "It's for my son."), note: "Mi hija = my daughter. For a child he may suggest the children's version." },
        { id: "for_other", s: t("Es | para | mi | esposa.", "It's | for | my | wife.", "It's for my wife.") },
      ],
    },
    howlong: {
      lt: "Say since when",
      items: [
        { id: "since", s: t("Desde | ayer.", "Since | yesterday.", "Since yesterday."), note: "Desde hace tres días = for three days; desde esta mañana = since this morning." },
        { id: "since_days", s: t("Desde | hace | tres | días.", "Since | ago | three | days.", "For three days now.") },
      ],
    },
    meds: {
      lt: "Say whether you take other medicines",
      items: [
        { id: "meds_none", s: t("No, | no tomo | nada.", "No, | I don't take | anything.", "No, I'm not taking anything.") },
        { id: "meds_bp", s: t("Tomo | pastillas | para | la | presión.", "I-take | pills | for | the | blood pressure.", "I take blood pressure pills.") },
      ],
    },
    allergy: {
      lt: "Say whether you're allergic",
      items: [
        { id: "allergy_none", s: t("No | soy | {m:alérgico|f:alérgica} | a | nada.", "Not | I-am | allergic | to | anything.", "I'm not allergic to anything.") },
        { id: "allergy_pen", s: t("Soy | {m:alérgico|f:alérgica} | a | la | penicilina.", "I-am | allergic | to | — | penicillin.", "I'm allergic to penicillin.",
          { flags: { 3: "la: Spanish uses the article for a substance in general; English doesn't." } }) },
      ],
    },
    accept: {
      lt: "Take it, or ask for something else",
      items: [
        { id: "ok_fine", s: t("Sí, | está bien.", "Yes, | it's fine.", "Yes, that's fine.") },
        { id: "take_it", s: t("Sí, | me lo | llevo.", "Yes, | it for me | I-take.", "Yes, I'll take it."), note: "lo / la / los / las agrees with the medicine: “me la llevo” (la loratadina), “me las llevo” (las pastillas)." },
        { id: "other", s: t("¿Tiene | otra | cosa?", "Do you have | another | thing?", "Do you have anything else?") },
        { id: "decline", s: t("No, | gracias, | no lo necesito.", "No, | thanks, | I don't need it.", "No thanks, I don't need it.") },
        { id: "go_doctor", s: t("Mejor | paso | con | el | doctor.", "Better | I-go in | with | the | doctor.", "I'd rather see the doctor.") },
      ],
    },
    ask: {
      lt: "Ask about the medicine",
      items: [
        { id: "q_price", s: t("¿Cuánto | cuesta?", "How much | does it cost?", "How much is it?") },
        { id: "q_drowsy", s: t("¿Da | sueño?", "Does it cause | sleepiness?", "Does it make you drowsy?") },
        { id: "q_rx", s: t("¿Necesito | receta?", "Do I need | prescription?", "Do I need a prescription?") },
        { id: "q_food", s: t("¿Se toma | con | alimentos?", "Is it taken | with | food?", "Do I take it with food?") },
        { id: "q_alcohol", s: t("¿Puedo | tomar | alcohol?", "Can I | drink | alcohol?", "Can I drink alcohol with it?"), note: "tomar = to take (a medicine) and also to drink." },
        { id: "q_kids", s: t("¿Sirve | para | niños?", "Does it work | for | children?", "Is it okay for children?") },
        { id: "q_cheaper", s: t("¿Hay | algo | más | barato?", "Is there | something | more | cheap?", "Is there anything cheaper?") },
        { id: "q_generic", s: t("¿Tiene | genérico?", "Do you have | generic?", "Do you have a generic?"), note: "The generic is the same substance, and much cheaper." },
      ],
    },
    dose: {
      lt: "Ask how to take it",
      items: [
        { id: "how_often", s: t("¿Cada | cuánto | se toma?", "Every | how much | is it taken?", "How often do I take it?") },
        { id: "how_take", s: t("¿Cómo | se toma?", "How | is it taken?", "How do I take it?") },
        { id: "how_many", s: t("¿Cuántas | al | día?", "How many | a | day?", "How many a day?") },
        { id: "how_use", s: t("¿Cómo | se usa?", "How | is it used?", "How do I use it?"), note: "For a cream or a spray." },
      ],
    },
    generic: {
      lt: "Choose brand-name or generic",
      items: [
        { id: "generic", s: t("El | genérico, | por favor.", "The | generic, | please.", "The generic, please."), note: "The same substance as the brand-name medicine, and cheaper." },
        { id: "patent", s: t("De patente, | por favor.", "Brand-name, | please.", "Brand-name, please.",
          { neutral: t("De marca, | por favor.", "Brand-name, | please.", "Brand-name, please.") }), note: "Mexico says “de patente”; “de marca” is understood everywhere." },
        { id: "q_diff", s: t("¿Cuál | es | la | diferencia?", "What | is | the | difference?", "What's the difference?") },
      ],
    },
    doctor: {
      lt: "The doctor next door",
      items: [
        { id: "go_doctor", s: t("Sí, | paso | con | el | doctor.", "Yes, | I-go in | with | the | doctor.", "Yes, I'll see the doctor.") },
        { id: "q_consult", s: t("¿Cuánto | cuesta | la | consulta?", "How much | costs | the | visit?", "How much is the visit?") },
        { id: "q_consult_where", s: t("¿Dónde | está | el | consultorio?", "Where | is | the | doctor's office?", "Where's the doctor's office?") },
      ],
    },
    questions: {
      lt: "Say whether you have questions",
      items: [
        { id: "no_questions", s: t("No, | ninguna, | gracias.", "No, | none, | thanks.", "No, none, thanks.") },
        { id: "q_alcohol", s: t("¿Puedo | tomar | alcohol?", "Can I | drink | alcohol?", "Can I drink alcohol with it?") },
      ],
    },
    more: {
      lt: "Say that's all (or ask for more)",
      items: [
        { id: "more_no", s: t("Es | todo, | gracias.", "It's | all, | thanks.", "That's all, thanks.") },
        { id: "prod_give", s: t("¿Me | da | {X.np}, | por favor?", "(To) me | you-give | {X.np}, | please?", "Can I have {X.np}, please?") },
      ],
      slot: "product", examples: ["bandaids", "sunscreen"],
    },
    pay: {
      lt: "Pay",
      items: [
        { id: "pay_card_short", s: t("Con | tarjeta, | por favor.", "With | card, | please.", "Card, please.") },
        { id: "take_cards", s: t("¿Acepta | tarjeta?", "Do you accept | card?", "Do you take cards?") },
        { id: "pay_cash", s: t("En efectivo.", "In cash.", "Cash.") },
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
        { id: "pay_phone", s: t("¿Puedo | pagar | con | el | celular?", "Can I | pay | with | the | cell phone?", "Can I pay with my phone?", { spain: t("¿Puedo | pagar | con | el | móvil?", "Can I | pay | with | the | cell phone?", "Can I pay with my phone?") }) },
      ],
    },
    bag: {
      lt: "Answer about the bag",
      items: [
        { id: "no_bag", s: t("No, | gracias, | no necesito | bolsa.", "No, | thanks, | I don't need | bag.", "No thanks, I don't need a bag.") },
      ],
    },
    thanks: {
      lt: "Thank him",
      items: [
        { id: "thanks_help", s: t("Muchas | gracias | por | la | ayuda.", "Many | thanks | for | the | help.", "Thanks so much for your help.") },
      ],
    },
  },

  tips: TIPS,

  merges: {
    "ahora mismo": { reason: "lexical_expression", split: "ahora → now + mismo → same is one expression: right away.", minimal: "Two words." },
    "en qué": { reason: "lexical_expression", split: "en → in + qué → what; ¿En qué le puedo ayudar? = how can I help you.", minimal: "Two words." },
    "se le ofrece": { reason: "lexical_expression", split: "se → itself + le → to you + ofrece → it offers; the service formula = do you need / can I get you.", minimal: "Three words." },
    "aquí al lado": { reason: "lexical_expression", split: "aquí → here + al → to the + lado → side; together = right next door.", minimal: "Three words." },
    "de al lado": { reason: "lexical_expression", split: "de → of + al → to the + lado → side; la puerta de al lado = the next door.", minimal: "Three words." },
    "hace falta": { reason: "lexical_expression", split: "hace → it makes + falta → lack; together = it's needed.", minimal: "Two words." },
    "no hace falta": { reason: "grammatical_fusion", split: "no → not + hace falta → it's needed; = it's not needed (S-NEG on a fixed expression).", minimal: "Three words." },
    "no se le quita": { reason: "grammatical_fusion", split: "no → not + se → itself + le → from you + quita → removes; quitársele (a pain) = to go away; with no = it doesn't go away.", minimal: "Four words, one verb phrase." },
    "se me acabó": { reason: "grammatical_fusion", split: "se → itself + me → on me + acabó → it ended; = I ran out of it.", minimal: "Three words, one verb phrase." },
    "lo mismo": { reason: "lexical_expression", split: "lo → it + mismo → same; = the same (thing).", minimal: "Two words." },
    "de patente": { reason: "lexical_expression", split: "de → of + patente → patent; of a medicine = brand-name.", minimal: "Two words." },
    "de marca": { reason: "lexical_expression", split: "de → of + marca → brand; of a medicine = brand-name.", minimal: "Two words." },
    "por si acaso": { reason: "lexical_expression", split: "por → for + si → if + acaso → perhaps; together = just in case.", minimal: "Three words." },
    "da igual": { reason: "lexical_expression", split: "da → it gives + igual → equal; = it doesn't matter.", minimal: "Two words." },
    "un poco": { reason: "lexical_expression", split: "un → a + poco → little; together = a little / a bit.", minimal: "Two words." },
    "después de": { reason: "lexical_expression", split: "después → after + de → of; the preposition = after.", minimal: "Two words." },
    "antes de": { reason: "lexical_expression", split: "antes → before + de → of; the preposition = before.", minimal: "Two words." },
    "me quemé": { reason: "grammatical_fusion", split: "me → myself + quemé → I burned; the reflexive verb = I got burned.", minimal: "Two words." },
    "me siento": { reason: "grammatical_fusion", split: "me → myself + siento → I feel; sentirse (reflexive) = I feel.", minimal: "Two words." },
    "otra vez": { reason: "lexical_expression", split: "otra → another + vez → time; = again.", minimal: "Two words." },
  },

  mission: [
    { lt: "Say what's wrong (or what you need)", optional: true, when: (c) => c.s.mode !== "rx" && !c.s.rxOffer, done: (c) => c.s.mode !== "rx" && !!(c.s.symptom || product(c)) },
    { lt: "Answer the pharmacist's questions", optional: true,
      when: (c) => c.s.mode !== "rx" && !c.s.rxOffer && !!(c.s.askWho || c.s.askHowLong || c.s.askMeds || c.s.askAllergy) && !!c.s.symptom,
      done: (c) => !!c.s.symptom && !openQuestions(c) },
    { lt: "Choose a medicine", optional: true, when: (c) => c.s.mode !== "rx" && !c.s.rxOffer, done: (c) => !!product(c) },
    { lt: "Hand over your prescription", optional: true, when: (c) => c.s.mode === "rx" || !!c.s.rxOffer, done: (c) => !!c.s.rxRead },
    { lt: "Choose brand-name or generic", optional: true, when: (c) => !!c.s.genAsked, done: (c) => !c.s.genFor },
    { lt: "Ask how to take it", done: (c) => !!c.s.dosageGiven },
    { lt: "Pay", done: (c) => !!c.s.paid },
  ],

  // -------------------------------------------------------------------------

  steps: [
    // Over the counter
    { id: "need", when: (c) => c.s.mode !== "rx" && !c.s.decision, done: (c) => !!(c.s.symptom || product(c)),
      ask: (c) => { c.s.rxOffer = false; c.say(c.s.wantsRx ? "ask_symptoms" : "ask_need"); },
      expects: ["need_symptom", "symptom_state", "need_product", "rx_pickup", "feel_sick", "symptom_ctx", "help_me", "product_unknown"],
      suggest: [
        { lt: "Say what's wrong", hint: "symptom" },
        { lt: "Ask for a product", hint: "product", options: "product" },
        { lt: "Fill a prescription", hint: "rx" },
      ],
      help: (c) => { c.say("ask_symptoms"); } },
    { id: "who", when: (c) => c.s.mode !== "rx" && !!c.s.symptom && c.s.askWho && !c.s.decision, done: (c) => !!c.s.forWho,
      ask: (c) => c.say("ask_who"), expects: ["who_ans"],
      suggest: [{ lt: "Say who it's for", hint: "who" }, { lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => { c.s.forWho = "me"; },
      no: (c) => { askWhoFor(c); } },
    { id: "howlong", when: (c) => c.s.mode !== "rx" && !!c.s.symptom && c.s.askHowLong && !c.s.decision, done: (c) => c.s.days !== undefined,
      ask: (c) => c.say(c.s.forWho && c.s.forWho !== "me" ? "ask_when" : "ask_howlong"), expects: ["howlong_ans", "howlong_ctx"],
      suggest: [{ lt: "Say since when", hint: "howlong" }],
      // "No sé": he goes on (the global "no sé" holds the turn, which left him silent)
      help: (c) => { c.s.days = 1; c.say("ack"); goOn(c); } },
    { id: "meds", when: (c) => c.s.mode !== "rx" && !!c.s.symptom && c.s.askMeds && !c.s.decision, done: (c) => !!c.s.meds,
      ask: (c) => c.say(c.s.forWho && c.s.forWho !== "me" ? "ask_meds_other" : "ask_meds"), expects: ["meds_ans", "meds_ctx"],
      suggest: [{ lt: "Say whether you take other medicines", hint: "meds" }, { lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => { c.say("ask_meds_which"); c.hold(); },
      no: (c) => { c.s.meds = "none"; c.say("ack"); },
      // "No sé" (or, after "¿Cuál?", "No sé cuál"): a medicine he can't check, so nothing that could mix badly
      help: (c) => { c.s.meds = "risk"; c.say("ack"); goOn(c); } },
    { id: "allergy",
      when: (c) => !c.s.decision && c.s.askAllergy && (c.s.mode === "rx" ? !!c.s.rxRead : !!c.s.symptom),
      done: (c) => !!c.s.allergy,
      ask: (c) => c.say(c.s.mode === "rx" ? "rx_allergy_q" : c.s.forWho && c.s.forWho !== "me" ? "ask_allergy_other" : "ask_allergy"), expects: ["allergy_ans", "allergy_ctx"],
      suggest: [{ lt: "Say whether you're allergic", hint: "allergy" }, { lt: "Say yes or no", hint: "g_yesno" }],
      // "¿Es alérgico a la penicilina?" — yes is the penicillin allergy
      yes: (c) => { if (c.s.mode === "rx") { c.s.allergy = "pen"; rxPen(c); return; } c.say("ask_allergy_which"); c.hold(); },
      no: (c) => { c.s.allergy = "none"; c.say("ack"); } },
    { id: "recommend", when: (c) => c.s.mode !== "rx" && !!c.s.symptom && !product(c) && !c.s.decision, done: (c) => !!product(c),
      ask: (c) => {
        const p = c.s.offer ?? recommendation(c);
        const was = REC[c.s.symptom];
        // the usual one ruled out (an allergy, other medicines) or already tried without relief: another one
        const why = was && was !== p ? unsafeWhy(c, was) : undefined;
        // (nothing he can give safely: the doctor next door)
        if (!p) { if (why && !c.s.recSaid) { c.s.recSaid = true; c.say(why); } noSafe(c); return; }
        c.s.offer = p;
        if (!c.s.recSaid) {
          c.s.recSaid = true;
          if (p === "acetaminophen" && was !== p && (why || was === c.s.took)) {
            if (why) c.say(why);
            c.say("switch_aceta");
          } else {
            if (why) c.say(why); // "Con esa alergia, mejor no tome paracetamol." "Le recomiendo ibuprofeno."
            c.say(c.s.long || c.s.wantsRx ? "rec_fornow" : "rec", { X: p });
          }
          // (an electrolyte drink is a drink, not a syrup)
          if (c.s.forWho === "child" && at(p).med) c.say(p === "oral_serum" ? "kids_yes" : "kids_formula");
        }
        sayRecQ(c, p, !!c.s.recQSaid);
        c.s.recQSaid = true;
      },
      expects: ["accept_rec", "accept_ctx", "need_product", "change_product", "other_option", "decline_rec", "ask_drowsy", "ask_rx_needed", "ask_price", "ask_kids", "ask_food",
        "ask_side_effects", "ask_cheaper", "ask_dosage", "go_doctor", "ask_alcohol"],
      suggest: [{ lt: "Take it, or ask for something else", hint: "accept" }, { lt: "Ask about the medicine", hint: "ask" }],
      yes: (c) => { acceptOffer(c); },
      no: (c) => { declineOffer(c); } },
    // The prescription
    { id: "rx_paper", when: (c) => c.s.mode === "rx" && !c.s.rxRead && !c.s.decision, done: (c) => !!c.s.rxRead,
      ask: (c) => { c.s.rxAsks = (c.s.rxAsks ?? 0) + 1; c.say(c.s.rxAsks > 1 ? "rx_ask_again" : "rx_ask"); },
      expects: ["hand_over", "hand_over_ctx", "no_rx_paper"],
      suggest: [{ lt: "Hand over the prescription", hint: "rx" }],
      yes: (c) => { handOver(c); },
      no: (c) => { noRxPaper(c); } },
    { id: "rx_brand", when: (c) => c.s.mode === "rx" && !!c.s.rxRead && !c.s.decision && !c.s.stamped && (!c.s.askAllergy || !!c.s.allergy), done: (c) => !!c.s.stamped,
      ask: (c) => { if (c.s.genFor) { c.say("generic_again"); c.expect(genericPending()); return; } askGenericOrTwist(c, "antibiotic"); },
      expects: ["generic_ans", "generic_ctx", "generic_q", "ask_price", "ask_cheaper"],
      suggest: [{ lt: "Choose brand-name or generic", hint: "generic" }] },
    { id: "dosage", when: (c) => !!product(c) && !c.s.dosageGiven && c.s.mode !== "rx" && !c.s.decision && !c.s.genFor, done: (c) => !!c.s.dosageGiven,
      ask: (c) => {
        c.s.dosageAsks = (c.s.dosageAsks ?? 0) + 1;
        if (c.s.dosageAsks > 2) { giveDosage(c); return; }
        if (c.s.volunteer) {
          giveDosage(c);
          c.say("questions_q");
          c.expect({ id: "questions_q", optional: true, hints: ["questions", "ask", "g_yesno"],
            expects: ["no_questions", "ask_dosage", "ask_drowsy", "ask_food", "ask_alcohol", "ask_kids", "ask_rx_needed", "ask_side_effects", "ask_how_long_take"],
            on: { no_questions: (cc) => { cc.say("ok"); } },
            suggest: [{ lt: "Say whether you have questions", hint: "questions" }, { lt: "Ask about the medicine", hint: "ask" }],
            yes: (cc) => { cc.say("go_ahead"); cc.hold(); }, no: (cc) => { cc.say("ok"); } });
          return;
        }
        c.say(at(product(c)!).skin ? "ask_use" : plural(product(c)!) ? "ask_questions_pl" : "ask_questions");
      },
      expects: ["ask_dosage", "first_time", "not_first", "know_ctx", "ask_drowsy", "ask_food", "ask_alcohol", "ask_kids", "ask_how_long_take", "ask_rx_needed", "ask_side_effects"],
      suggest: [{ lt: "Ask how to take it", hint: "dose" }, { lt: "Ask about the medicine", hint: "ask" }],
      // "No sé" to "¿Sabe cómo se toma?": the directions, then on to the total
      help: (c) => { giveDosage(c); goOn(c); },
      // (the directions may already have been given this turn: never twice in a row)
      yes: (c) => { if (!c.s.dosageGiven) knowsIt(c); },
      no: (c) => { if (!c.s.dosageGiven) giveDosage(c); } },
    { id: "more", when: (c) => c.s.mode !== "rx" && !!product(c) && c.s.askMore && !!c.s.dosageGiven && !c.s.decision && !c.s.genFor, done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("ask_more"), expects: ["more_no", "need_product", "need_symptom", "symptom_state"],
      suggest: [{ lt: "Say that's all (or ask for more)", hint: "more", options: "product" }, { lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => { c.say("what_else"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
    // Paying
    { id: "pay", when: (c) => basket(c).length > 0 && !!c.s.dosageGiven && c.s.decision !== "none" && (c.s.decision !== "doctor" || !!c.s.doctorLater) && !c.s.genFor
        && (c.s.mode !== "rx" || (!!c.s.stamped && (!c.s.askAllergy || !!c.s.allergy))),
      done: (c) => !!c.s.paid,
      ask: (c) => {
        if (!totalFresh(c)) {
          sayTotal(c);
          if (!c.s.payMethod && c.chance(0.4)) c.say("ask_pay_method");
          if (c.s.payMethod === "card" || c.s.payMethod === "phone") finishPay(c, c.s.payMethod);
          return;
        }
        if (c.s.payMethod !== "cash") c.say("ask_pay_method");
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "no_cash", "no_card", "ask_price", "ask_drowsy", "ask_food", "ask_alcohol", "ask_dosage", "ask_kids", "ask_rx_needed", "need_product"],
      suggest: [{ lt: "Pay (cash, card or phone)", hint: "pay" }, { lt: "Ask about the medicine", hint: "ask" }] },
    { id: "bag", when: (c) => !!c.s.paid && c.s.askBag, done: (c) => c.s.bag !== undefined,
      ask: (c) => c.say("ask_bag"), expects: ["no_bag", "bag_yes"],
      suggest: [{ lt: "Answer about the bag", hint: "bag" }, { lt: "Say yes or no", hint: "g_yesno" }],
      yes: (c) => { c.s.bag = true; c.say("bag_here"); },
      no: (c) => { c.s.bag = false; c.say("no_problem"); } },
  ],

  init: (c) => {
    c.s.mode = "otc";
    c.s.basket = [];
    c.s.gen = {};
    c.s.qty = {};
    c.s.askWho = c.chance(0.35);
    c.s.askHowLong = c.chance(0.6);
    c.s.askMeds = c.chance(0.45);
    c.s.askAllergy = c.chance(0.35);
    c.s.askMore = c.chance(0.5);
    c.s.askBag = c.chance(0.3);
    c.s.volunteer = c.chance(0.4);
    c.s.storeBrand = c.visits >= 1 && c.chance(0.4);
    c.s.rxPrompt = c.visits >= 1 && c.chance(0.3);
  },

  start: (c) => {
    if (c.s.rxPrompt) {
      c.twist("rx_prompt");
      c.say("rx_prompt");
      c.s.rxOffer = true; // the checklist shows the prescription plan until the learner says what else they need
      c.expect({
        id: "rx_prompt", optional: true, expects: ["rx_pickup", "hand_over"], hints: ["rx", "symptom"],
        suggest: [{ lt: "Say whether you have a prescription", hint: "rx" }, { lt: "Say what's wrong", hint: "symptom" }],
        // "No, tengo tos": the words say what they need instead
        on: {
          rx_pickup: (cc, sl, sg) => { pharmacy.handlers.rx_pickup(cc, sl, sg); },
          hand_over: (cc, sl, sg) => { pharmacy.handlers.hand_over(cc, sl, sg); },
          need_symptom: (cc, sl, sg) => { pharmacy.handlers.need_symptom(cc, sl, sg); },
          symptom_state: (cc, sl, sg) => { pharmacy.handlers.symptom_state(cc, sl, sg); },
          need_product: (cc, sl, sg) => { pharmacy.handlers.need_product(cc, sl, sg); },
          feel_sick: (cc, sl, sg) => { pharmacy.handlers.feel_sick(cc, sl, sg); },
          no_rx_paper: (cc) => { cc.s.rxOffer = false; cc.ask("need"); },
        },
        yes: (cc) => { startRx(cc); cc.ask("rx_paper"); },
        no: (cc) => { cc.s.rxOffer = false; cc.ask("need"); },
        ask: (cc) => cc.say("rx_prompt_again"),
      });
      return;
    }
    if (c.chance(0.3)) {
      c.say("greet_howareyou");
      expectHowAreYou(c);
      return;
    }
    // The greeting already asks "¿Qué le damos?"; the need step is the effective step.
    c.say(c.visits >= 1 && c.chance(0.4) ? "greet_back" : "greet");
    c.hold();
  },

  handlers: {
    need_symptom(c, slots, seg) { setSymptom(c, last(slots.symptom) ?? symptomFromTags(seg.tags)); },
    symptom_state(c, slots, seg) {
      const s = slots.symptom ? (Array.isArray(slots.symptom) ? slots.symptom[0] : slots.symptom) : symptomFromTags(seg.tags);
      if (seg.tags.includes("child")) c.s.forWho = "child";
      else if (seg.tags.includes("adult")) c.s.forWho = "adult";
      if (!s) { if (c.s.forWho === "child") fixUnsafe(c); return; }
      setSymptom(c, s);
      // "Me duele la garganta desde ayer": how long is answered too
      const d = daysFromTags(seg.tags, slots);
      if (d !== undefined && c.s.days === undefined && c.s.mode !== "rx") setDays(c, d);
      // aspirin on the counter, and now it's for a child: acetaminophen instead
      if (c.s.forWho === "child") fixUnsafe(c);
    },
    symptom_ctx(c, slots, seg) { pharmacy.handlers.symptom_state(c, slots, seg); },
    feel_sick(c) {
      if (c.s.mode !== "rx") c.s.rxOffer = false;
      if (c.s.symptom) { c.say("ack"); return; }
      c.s.sorrySaid = true;
      c.say("sorry_symptom");
      c.say("ask_symptoms");
      c.expect({ id: "sick_q", expects: ["symptom_state", "need_symptom", "symptom_ctx"], hints: ["symptom"], suggest: [{ lt: "Say your symptoms", hint: "symptom" }],
        on: {
          symptom_state: (cc, sl, sg) => { pharmacy.handlers.symptom_state(cc, sl, sg); },
          need_symptom: (cc, sl, sg) => { pharmacy.handlers.need_symptom(cc, sl, sg); },
          symptom_ctx: (cc, sl, sg) => { pharmacy.handlers.symptom_state(cc, sl, sg); },
        },
        ask: (cc) => cc.say("ask_symptoms") });
    },
    need_product(c, slots, seg) {
      const id = last(slots.product) as string | undefined;
      if (!id) return;
      if (c.s.mode !== "rx") c.s.rxOffer = false;
      setGenFromTags(c, id, seg.tags);
      if (at(id).rx && c.s.mode !== "rx") { refuseRx(c); return; }
      if (c.s.mode === "rx" && id === "antibiotic") { if (!c.s.rxRead) return; c.say("ack"); return; }
      // ruled out by an allergy, other medicines or a child: the reason, and acetaminophen instead
      const why = basket(c).includes(id) ? undefined : unsafeWhy(c, id);
      if (why) { steerToAceta(c, why); return; }
      if (c.step === "more") c.s.moreDone = false;
      // "Deme dos cajas": the number is said back and counted in the total
      const q = qtyFromTags(seg.tags);
      if (basket(c).includes(id)) {
        if (q !== qtyOf(c, id) && q > 1 && !locked(c, id)) { setQty(c, id, q); c.say(q === 3 ? "qty_three" : "qty_two"); } else c.say("ack");
        return;
      }
      setQty(c, id, q);
      c.say(q === 3 ? "qty_three" : q === 2 ? "qty_two" : "product_ok");
      addProduct(c, id);
    },
    product_unknown(c) {
      c.s.rxOffer = false;
      offerDoctor(c, ["unknown_product"]);
    },
    change_product(c, slots, seg) {
      const id = last(slots.product) as string | undefined;
      if (!id) return;
      setGenFromTags(c, id, seg.tags);
      if (at(id).rx && c.s.mode !== "rx") { refuseRx(c); return; }
      const why = unsafeWhy(c, id);
      if (why) { steerToAceta(c, why); return; }
      const cur = product(c);
      let boxes = 1; // "Mejor paracetamol" after two boxes of ibuprofen: two boxes of it
      // (one paid for already stays: the new one is a second sale)
      if (cur && cur !== id && at(cur).med && at(id).med && !locked(c, cur)) {
        boxes = qtyOf(c, cur);
        const i = basket(c).indexOf(cur);
        if (i >= 0) basket(c).splice(i, 1);
        setQty(c, cur, 1);
        c.s.product = undefined;
        c.s.dosageGiven = false;
        if (c.s.genFor === cur) c.s.genFor = undefined;
      }
      c.s.offer = id;
      c.say("product_ok");
      if (boxes > 1 && !basket(c).includes(id)) setQty(c, id, boxes);
      addProduct(c, id);
    },
    other_option(c) {
      // "¿Tiene otra cosa?" at his recommendation: the other medicine, if there is a safe one (asking is no no)
      if (!product(c) && (c.step === "recommend" || c.s.offer)) {
        if (!c.s.altOffered && safeAlt(c, c.s.offer ?? recommendation(c))) { declineOffer(c); return; }
        c.say("rec_nothing_else"); return;
      }
      // nothing asked for yet: what's wrong?
      if (!product(c) && !c.s.symptom) { c.say("ask_symptoms"); c.hold(); return; }
      const cur = product(c);
      const alt = cur ? safeAlt(c, cur) : undefined;
      if (alt && !basket(c).includes(alt)) { c.s.offer = alt; c.say("rec_alt", { X: alt }); sayRecQ(c, alt); c.expect(altPending(alt, true)); }
      else c.say("rec_nothing_else");
    },
    accept_rec(c, _slots, seg) {
      if (!product(c) && (c.s.offer || c.s.symptom)) {
        // "Sí, deme dos": two boxes of what he recommends
        const q = qtyFromTags(seg?.tags ?? []);
        if (q > 1) { setQty(c, c.s.offer ?? recommendation(c), q); c.say(q === 3 ? "qty_three" : "qty_two"); }
        acceptOffer(c);
      } else if (product(c)) c.say("product_ok");
    },
    accept_ctx(c) {
      // "Está bien, gracias" / "Vale, gracias" at an offer could be "no, thanks": the question again (rule 17)
      if (POLITE.test(c.heard)) return;
      pharmacy.handlers.accept_rec(c, {}, { intent: "accept_rec", slots: {}, tags: [] });
    },
    decline_rec(c) {
      if (c.step === "recommend" || (c.s.offer && !product(c))) { declineOffer(c); return; }
      // "No, no necesito nada" at "¿Algo más?": that's all
      if (c.step === "more") { c.s.moreDone = true; return; }
      c.say("no_problem");
    },
    who_ans(c, slots, seg) {
      const tags = seg.tags;
      if (tags.includes("notme")) { askWhoFor(c); return; }
      if (tags.includes("child") || (typeof slots.n === "number" && slots.n < 12)) c.s.forWho = "child";
      else if (tags.includes("adult") || tags.includes("age")) c.s.forWho = "adult";
      else c.s.forWho = "me";
      c.say("ack");
      if (c.s.forWho === "child") fixUnsafe(c);
    },
    howlong_ans(c, slots, seg) {
      const d = daysFromTags(seg.tags, slots);
      if (c.s.days !== undefined && d === undefined) { c.say("ack"); return; }
      setDays(c, d ?? 1, true);
    },
    howlong_ctx(c, slots, seg) { pharmacy.handlers.howlong_ans(c, slots, seg); },
    meds_ctx(c, slots, seg) { pharmacy.handlers.meds_ans(c, slots, seg); },
    allergy_ctx(c, slots, seg) { pharmacy.handlers.allergy_ans(c, slots, seg); },
    meds_ans(c, slots, seg) {
      if (seg.tags.includes("took")) {
        // "Ya tomé paracetamol, pero no me hizo nada": recorded (never an order), and not recommended again
        if (!c.s.meds) c.s.meds = "took";
        const took = last(slots.product) as string | undefined;
        if (took) c.s.took = took;
        c.say("allergy_ok");
        if (took && !product(c) && c.s.offer === took && safeAlt(c, took)) { c.s.offer = undefined; c.s.recSaid = false; c.s.recQSaid = false; }
        return;
      }
      // "Tomo otro medicamento": "¿Cuál?" (the answer comes as meds_ans or meds_ctx)
      if (seg.tags.includes("which")) { askWhichMed(c); return; }
      if (seg.tags.includes("bp")) c.s.meds = "bp";
      else if (seg.tags.includes("risk")) c.s.meds = "risk";
      else if (seg.tags.includes("gland")) c.s.meds = "gland";
      else if (seg.tags.includes("vit")) c.s.meds = "vit";
      else if (seg.tags.includes("other")) c.s.meds = "other";
      else c.s.meds = "none";
      // ("Con eso no hay problema" only for medicines that mix with all of his: cholesterol pills, the pill)
      if (c.s.meds === "other") c.say("meds_ok"); else c.say("ack");
      // blood-pressure (or heart…) pills and ibuprofen or a cold medicine already on the counter: acetaminophen instead
      if (fixUnsafe(c)) return;
      if (!product(c) && c.s.offer && unsafeWhy(c, c.s.offer)) { c.s.offer = undefined; c.s.recSaid = false; c.s.recQSaid = false; }
    },
    allergy_ans(c, _slots, seg) {
      const tags = seg.tags;
      // "No soy alérgico a la penicilina" / "A la penicilina no": no allergy
      c.s.allergy = tags.includes("neg") ? "none" : tags.includes("nsaid") ? "nsaid" : tags.includes("pen") ? "pen" : tags.includes("para") ? "para" : tags.includes("other") ? "other" : "none";
      if (c.s.mode === "rx") {
        if (c.s.allergy === "pen" && c.s.rxRead) { rxPen(c); return; }
        c.say(c.s.allergy === "none" ? "ack" : "allergy_ok");
        return;
      }
      // ibuprofen or aspirin on the counter: acetaminophen instead; only on offer: he recommends again
      if (fixUnsafe(c)) return;
      if (!product(c) && c.s.offer && unsafeWhy(c, c.s.offer)) { c.s.offer = undefined; c.s.recSaid = false; c.s.recQSaid = false; c.say("allergy_ok"); return; }
      c.say(c.s.allergy === "none" ? "ack" : "allergy_ok");
    },
    ask_dosage(c) {
      const id = product(c);
      if (!id) {
        if (c.s.offer) { giveDosageFor(c, c.s.offer); return; }
        if (c.s.symptom) { c.say("dose_first"); return; }
        c.say("ask_need"); c.hold(); return;
      }
      if (c.s.mode === "rx" && !c.s.rxRead) { c.say("rx_ask_again"); c.hold(); return; }
      giveDosage(c);
    },
    ask_drowsy(c) {
      const id = product(c) ?? c.s.offer;
      if (!id) { if (c.s.symptom) c.say("dose_first"); else { c.say("ask_need"); c.hold(); } return; }
      const d = at(id).drowsy;
      if (d === "little") c.say("drowsy_little");
      else if (d === "yes") c.say("drowsy_yes");
      else if (at(id).skin || at(id).noDose) c.say("alcohol_skin");
      else c.say("drowsy_no");
    },
    ask_rx_needed(c, slots) {
      const id = (slots.product ? last(slots.product) : undefined) ?? product(c) ?? c.s.offer;
      if (id && at(id).rx) { c.say("antibiotic_rx"); return; }
      if (!id) { c.say("rx_stronger"); return; }
      c.say("rx_not_needed");
    },
    ask_food(c) {
      const id = product(c) ?? c.s.offer;
      if (!id) return;
      if (c.s.mode === "rx") { c.say("rx_food"); return; }
      if (at(id).skin || at(id).noDose) { c.say("alcohol_skin"); return; }
      const f = at(id).food;
      c.say(f === "with" ? "food_with" : f === "after" ? "food_after" : "food_any");
    },
    ask_alcohol(c) {
      if (c.s.mode === "rx") { c.say("rx_alcohol"); return; }
      const id = product(c) ?? c.s.offer;
      if (!id) return;
      c.say(at(id).skin || at(id).noDose ? "alcohol_skin" : "alcohol_no");
    },
    ask_kids(c) {
      // the medicine on offer, else the last thing put on the counter ("También un protector solar… ¿Se le puede poner
      // a niños?" is about the sunscreen)
      const id = (c.s.offer && !basket(c).includes(c.s.offer) ? c.s.offer : undefined) ?? (last(basket(c)) as string | undefined) ?? c.s.offer;
      // never aspirin for a child; a cream or bug spray has no dose by weight (the label says from what age)
      if (id === "aspirin") { c.say("kids_aspirin"); return; }
      if (id && at(id).noDose) { c.say("kids_ok"); return; }
      if (id && at(id).skin) { c.say("kids_skin"); return; }
      c.say("kids_yes");
      c.say("kids_dose");
    },
    ask_side_effects(c) { c.say("side_effects"); },
    ask_how_long_take(c) { if (c.s.mode === "rx") { c.say("rx_read"); return; } c.say("how_long_take"); c.s.doctorSaid = true; },
    ask_price(c, slots) {
      if (payReady(c) && !slots.product) { sayTotal(c); c.hold(); return; }
      if (c.s.genFor && !slots.product) { genPrices(c, c.s.genFor); return; }
      const id = (slots.product ? last(slots.product) : undefined) ?? product(c) ?? c.s.offer;
      // (a prescription not read yet: it depends on what's on it, and he asks for it again)
      if (!id) { if (c.s.symptom || c.s.mode === "rx") c.say("depends"); else { c.say("ask_need"); c.hold(); } return; }
      if (at(id).generic && gen(c)[id] === undefined) { genPrices(c, id); return; }
      // "¿Cuánto es?" with two boxes on the counter: both
      c.say("price_is", { price: priceOf(c, id) * (slots.product ? 1 : qtyOf(c, id)) });
    },
    ask_cheaper(c, _slots, seg) {
      // "¿Es muy caro?" (a question) gets the price
      if (seg.tags.includes("caro") && /\?/.test(c.heard)) { pharmacy.handlers.ask_price(c, {}, seg); return; }
      const id = c.s.genFor ?? product(c) ?? c.s.offer;
      if (id && at(id).generic) {
        if (gen(c)[id] === true) { c.say("cheaper_already"); return; }
        if (c.s.genFor === id) { genPrices(c, id); return; }
        c.say("cheaper_yes", { price: at(id).generic });
        if (gen(c)[id] === false && basket(c).includes(id)) { if (!locked(c, id)) { c.say("switch_q"); c.expect(switchPending(id)); } return; }
        gen(c)[id] = true;
        return;
      }
      c.say("cheaper_none");
    },
    ask_where(c) { c.say("where_it_is"); },
    help_me(c) {
      // on its own ("Tengo una pregunta") he invites it; followed by the question, the question is answered
      if (/(ayudar|pregunta|ayuda)[\s.!?,]*$/i.test(c.heard.trim())) { c.say("go_ahead"); c.hold(); }
    },
    more_no(c) { if (c.step === "more" || c.s.dosageGiven) c.s.moreDone = true; },
    pay_card(c) { choosePay(c, "card"); },
    no_cash(c) { choosePay(c, "card"); },
    no_card(c) { choosePay(c, "cash"); },
    pay_cash(c) { choosePay(c, "cash"); },
    pay_phone(c) { choosePay(c, "phone"); },
    here_you_go(c, slots) {
      // the prescription handed over (asked for it, or just told it's needed)
      if (!c.s.rxRead && !c.s.decision && !slots.price && (c.s.mode === "rx" || (c.s.wantsRx && !product(c)))) { startRx(c); handOver(c); return; }
      if (c.s.paid) { c.say("ack"); return; }
      if (!totalFresh(c)) {
        // money handed over before he said the total: he says it, then takes it
        if (payReady(c)) { sayTotal(c); finishPay(c, "cash", slots.price as number | undefined); return; }
        c.say("pay_later"); return;
      }
      finishPay(c, c.s.payMethod === "card" || c.s.payMethod === "phone" ? c.s.payMethod : "cash", slots.price as number | undefined);
    },
    // "¡Gracias, adiós!" right after paying: the purchase is complete. Before paying it ends the visit, not completed.
    g_bye(c) {
      if (c.s.paid) sold(c);
      c.say("g_bye"); c.end(); c.hold();
    },
    // "¿Acepta dólares?": pesos only, but the card works (nothing paid); "¿Me da el ticket?"; "¿A qué hora cierran?"
    ask_dollars(c) { c.say("no_dollars"); },
    ask_receipt(c) { c.say(c.s.paid ? "receipt_here" : "receipt_later"); },
    ask_hours(c) { c.say("hours"); },
    no_bag(c) { c.s.bag = false; c.say("no_problem"); },
    bag_yes(c) { c.s.bag = true; c.say("bag_here"); },
    no_questions(c) { c.say("ok"); },
    know_ctx(c) { knowsIt(c); },
    will_do_ctx(c) { c.say("g_bye"); c.end(); },
    no_rx_paper(c) {
      if (c.s.mode === "rx" && !c.s.rxRead) { noRxPaper(c); return; }
      if (c.s.wantsRx) { c.say("rx_need_paper"); if (!c.s.decision) c.expect(doctorPending()); return; }
      c.say("no_rx_ok");
    },
    thanks_help(c) { c.say("g_welcome"); },
    // --- the prescription
    rx_pickup(c) {
      c.s.rxOffer = false;
      if (c.s.rxRead) { c.say("ack"); return; }
      if (c.s.mode !== "rx") startRx(c);
      // "Traigo una receta, aquí está": the hand-over follows in the same turn
      if (!/aqu[ií] (est[aá]|tiene)|tenga|t[oó]mela/i.test(c.heard) && !/\bno (la |lo )?(traigo|tengo|traje)\b|olvid|dej[eé]|se me qued/i.test(c.heard)) c.ask("rx_paper");
    },
    hand_over(c) {
      if (c.s.rxRead) { c.say("ack"); return; }
      if (c.s.mode !== "rx") startRx(c);
      handOver(c);
    },
    hand_over_ctx(c, slots, seg) { pharmacy.handlers.hand_over(c, slots, seg); },
    // --- brand-name or generic
    generic_ans(c, _slots, seg) {
      if (markedThisTurn(c, "genq")) return; // settled earlier in this turn (askGenericOrTwist)
      const id = c.s.genFor ?? product(c) ?? c.s.offer;
      if (!id || !at(id).generic) { c.say("ack"); return; }
      const t = seg.tags;
      // paid for already: it isn't switched now (that would hand over the other one unpaid)
      if (!c.s.genFor && locked(c, id)) { c.say("paid_already"); return; }
      // "Genérico no, de patente" / "No el genérico" (no comma): which one? (rule 10)
      if (t.includes("amb")) { c.say("which_one"); if (c.s.genFor) c.expect(genericPending()); else c.hold(); return; }
      // "¿Cuánto cuesta el genérico?": the price question answers; never a choice (rule 17)
      if (/cu[aá]nto|precio|a c[oó]mo/i.test(c.heard)) { if (c.s.genFor) c.expect(genericPending()); return; }
      const g = t.includes("notgen") ? false : t.includes("notpat") ? true : t.includes("pat") ? false : true;
      const onOffer = !c.s.genFor && !product(c) && c.s.offer === id && c.s.mode !== "rx";
      // A question ("¿Y el genérico?", by voice "y el genérico") gets the prices while nothing is chosen yet
      if ((onOffer || c.s.genFor === id) && asksAbout(c.heard)) { genPrices(c, id); if (c.s.genFor) c.expect(genericPending()); return; }
      // At his recommendation, "No quiero el de patente" only says which one: it doesn't take the medicine
      if (onOffer && (t.includes("notgen") || t.includes("notpat"))) { gen(c)[id] = g; c.say("ack"); return; }
      // "El genérico" while his recommendation is on offer: that one, as a generic
      if (onOffer) {
        gen(c)[id] = g;
        c.say((g ? "gen_ok" : "pat_ok") + (at(id).pro === "la" ? "_f" : ""));
        if (c.s.paid) reopenSale(c);
        basket(c).push(id);
        c.s.product = id; c.s.dosageGiven = false;
        return;
      }
      chooseGeneric(c, id, g);
    },
    // (only expected at "¿Quiere el genérico, entonces?", whose own handler switches)
    switch_ctx(c) { c.say("ack"); },
    generic_ctx(c) {
      const id = c.s.genFor;
      if (!id) { c.say("ack"); return; }
      c.say("generic_rec");
      chooseGeneric(c, id, true);
    },
    generic_q(c, _slots, seg) {
      const id = c.s.genFor ?? product(c) ?? c.s.offer;
      if (seg.tags.includes("price") && id && at(id).generic) { genPrices(c, id); return; }
      if (seg.tags.includes("which")) {
        if (c.s.genFor) { c.say("generic_rec"); return; }
        if (c.s.offer && !product(c)) { c.say("rec", { X: c.s.offer }); return; }
      }
      c.say("generic_diff");
    },
    // --- the doctor
    go_doctor(c) { goDoctor(c); },
    no_doctor(c) { c.s.doctorNo = true; c.say("ack"); },
    doctor_ctx(c) {
      if (/^[\s¿¡]*(s[ií]|ok|va|claro|bueno)(?=[\s,.!?]|$)/i.test(c.heard)) { goDoctor(c); return; }
      c.say("doc_where");
      if (!c.s.decision) { c.say("doctor_ask_again"); c.expect(doctorPending()); }
    },
    not_product(c, slots) {
      const id = last(slots.product) as string | undefined;
      if (!id) return;
      // on the counter and not paid: he puts it back
      if (basket(c).includes(id) && !locked(c, id)) {
        basket(c).splice(basket(c).indexOf(id), 1);
        setQty(c, id, 1);
        if (c.s.genFor === id) c.s.genFor = undefined;
        if (product(c) === id) { c.s.product = basket(c)[0]; c.s.dosageGiven = !c.s.product || !!at(c.s.product).noDose; }
        c.say("ok");
        settle(c);
        if (!basket(c).length && c.s.symptom) { c.s.offer = undefined; c.s.recSaid = false; }
        return;
      }
      if (c.s.offer === id && !product(c)) { declineOffer(c); return; }
      c.say("ack");
    },
    doctor_q(c, _slots, seg) {
      const tg = seg.tags;
      c.say(tg.includes("price") ? "doc_price" : tg.includes("where") ? "doc_where" : tg.includes("hours") ? "doc_hours" : tg.includes("cita") ? "doc_cita" : "doc_here");
    },
    // --- dosage step
    first_time(c) { giveDosage(c); },
    not_first(c) { knowsIt(c); },
  },

  finish: (c) => {
    if (c.s.paid) {
      sold(c);
      const sick = !!c.s.symptom || c.s.mode === "rx" || basket(c).some((id) => at(id).med);
      c.say(sick ? "feel_better" : "closing_other");
      if (c.s.doctorLater) c.say("doctor_bye");
      else if (c.s.symptom && !c.s.doctorOffered && !c.s.doctorSaid && !c.s.rxRead) {
        // (for a child or another adult too: "vayan al doctor", the learner and the patient)
        c.say(!c.s.forWho || c.s.forWho === "me" ? "see_doctor" : "see_doctor_other");
        c.s.doctorSaid = true;
      }
    } else if (c.s.decision === "doctor") {
      c.say("doctor_bye");
    } else {
      c.say(c.s.symptom ? "feel_better" : "closing_nobuy");
    }
    c.expect({ id: "closing", optional: true, hints: ["thanks", "g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
        thanks_help: (cc) => { cc.say("g_welcome"); cc.end(); },
        will_do_ctx: (cc) => { cc.say("g_bye"); cc.end(); },
        // "¿Me da el ticket?", "¿A qué hora cierran?" on the way out: expected here (so "me da" isn't read as a yes to
        // the medicine), answered by their own handlers, and the goodbye stays open
        ask_receipt: () => false,
        ask_hours: () => false,
        // "Bueno, sí, deme el paracetamol" after saying no: the visit goes on (not after paying)
        need_product: (cc, sl, sg) => reopen(cc, () => pharmacy.handlers.need_product(cc, sl, sg)),
        change_product: (cc, sl, sg) => reopen(cc, () => pharmacy.handlers.change_product(cc, sl, sg)),
        accept_rec: (cc, sl, sg) => reopen(cc, () => { if (cc.s.offer) acceptOffer(cc); else pharmacy.handlers.accept_rec(cc, sl, sg); }),
        need_symptom: (cc, sl, sg) => reopen(cc, () => pharmacy.handlers.need_symptom(cc, sl, sg)),
        symptom_state: (cc, sl, sg) => reopen(cc, () => pharmacy.handlers.symptom_state(cc, sl, sg)),
        rx_pickup: (cc, sl, sg) => reopen(cc, () => pharmacy.handlers.rx_pickup(cc, sl, sg)),
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // what's wrong: every hint pattern and more
    { say: "Me duele la cabeza", intent: "symptom_state", step: "need", slots: { symptom: "headache" } },
    { say: "Me duele la garganta", intent: "symptom_state", slots: { symptom: "sore_throat" } },
    { say: "Me duele el estómago", intent: "symptom_state", slots: { symptom: "upset_stomach" } },
    { say: "¿Tiene algo para la tos?", intent: "need_symptom", step: "need", slots: { symptom: "cough" } },
    { say: "Tengo gripa", intent: "symptom_state", slots: { symptom: "cold" } },
    { say: "Tengo gripe", intent: "symptom_state", slots: { symptom: "cold" } },
    { say: "Tengo fiebre", intent: "symptom_state", slots: { symptom: "fever" } },
    { say: "Me quemé con el sol", intent: "symptom_state" },
    { say: "Me picaron los moscos", intent: "symptom_state" },
    { say: "Me picaron los mosquitos", intent: "symptom_state" },
    { say: "¿Qué me recomienda para la fiebre?", intent: "need_symptom", slots: { symptom: "fever" } },
    { say: "Me siento mal", intent: "feel_sick", step: "need" },
    { say: "No me siento bien", intent: "feel_sick", step: "need" },
    { say: "me duele mucho la panza desde ayer", intent: "symptom_state", slots: { symptom: "upset_stomach" } },
    { say: "Tengo diarrea", intent: "symptom_state", slots: { symptom: "diarrhea" } },
    { say: "Mi hijo tiene fiebre", intent: "symptom_state", slots: { symptom: "fever" } },
    { say: "Tienes algo para el dolor de cabeza", intent: "need_symptom", slots: { symptom: "headache" } },
    // products
    { say: "¿Tiene protector solar?", intent: "need_product", step: "need", slots: { product: "sunscreen" } },
    { say: "¿Me da un repelente, por favor?", intent: "need_product", slots: { product: "repellent" } },
    { say: "Busco bloqueador", intent: "need_product", slots: { product: "sunscreen" } },
    { say: "Unas curitas, por favor", intent: "need_product", slots: { product: "bandaids" } },
    { say: "¿Me vende amoxicilina?", intent: "need_product", slots: { product: "antibiotic" } },
    // the prescription
    { say: "Vengo a surtir una receta", intent: "rx_pickup", step: "need" },
    { say: "Traigo una receta del doctor", intent: "rx_pickup", step: "need" },
    { say: "Aquí está la receta", intent: "hand_over" },
    { say: "No tengo receta", intent: "no_rx_paper", not: ["rx_pickup", "hand_over"] },
    // his questions
    { say: "Sí, es para mí", intent: "who_ans", step: "who" },
    { say: "Es para mi hijo", intent: "who_ans", step: "who" },
    { say: "Es para mi esposa", intent: "who_ans", step: "who" },
    { say: "Desde ayer", intent: "howlong_ans", step: "howlong" },
    { say: "Desde hace tres días", intent: "howlong_ans", step: "howlong" },
    { say: "No, no tomo nada", intent: "meds_ans", step: "meds" },
    { say: "Tomo pastillas para la presión", intent: "meds_ans", step: "meds" },
    { say: "No soy alérgico a nada", intent: "allergy_ans", step: "allergy" },
    { say: "Soy alérgica a la penicilina", intent: "allergy_ans", step: "allergy" },
    // the recommendation
    { say: "Sí, me lo llevo", intent: "accept_rec", step: "recommend" },
    { say: "¿Tiene otra cosa?", intent: "other_option", step: "recommend" },
    { say: "No, gracias, no lo necesito", intent: "decline_rec", step: "recommend", not: ["accept_rec"] },
    { say: "Mejor paso con el doctor", intent: "go_doctor", step: "recommend", not: ["accept_rec"] },
    { say: "¿Cuánto cuesta?", intent: "ask_price", step: "recommend", not: ["accept_rec"] },
    { say: "¿Da sueño?", intent: "ask_drowsy", step: "recommend" },
    { say: "¿Necesito receta?", intent: "ask_rx_needed", step: "recommend" },
    { say: "¿Se toma con alimentos?", intent: "ask_food" },
    { say: "¿Puedo tomar alcohol?", intent: "ask_alcohol" },
    { say: "¿Sirve para niños?", intent: "ask_kids" },
    { say: "¿Hay algo más barato?", intent: "ask_cheaper" },
    { say: "¿Tiene genérico?", intent: "ask_cheaper" },
    { say: "Mejor paracetamol", intent: "change_product", step: "recommend", slots: { product: "acetaminophen" } },
    // how to take it
    { say: "¿Cada cuánto se toma?", intent: "ask_dosage", step: "dosage" },
    { say: "¿Cómo se toma?", intent: "ask_dosage", step: "dosage" },
    { say: "¿Cuántas al día?", intent: "ask_dosage", step: "dosage" },
    { say: "¿Cómo se usa?", intent: "ask_dosage", step: "dosage" },
    { say: "Ya lo he tomado antes", intent: "not_first", step: "dosage" },
    // brand-name or generic, the doctor
    { say: "El genérico, por favor", intent: "generic_ans" },
    { say: "De patente, por favor", intent: "generic_ans" },
    { say: "¿Cuál es la diferencia?", intent: "generic_q" },
    { say: "Sí, paso con el doctor", intent: "go_doctor" },
    { say: "¿Cuánto cuesta la consulta?", intent: "doctor_q", not: ["go_doctor", "ask_price"] },
    { say: "¿Dónde está el consultorio?", intent: "doctor_q" },
    // more, paying, the bag, thanks
    { say: "Es todo, gracias", intent: "more_no", step: "more" },
    { say: "Con tarjeta, por favor", intent: "pay_card", step: "pay" },
    { say: "¿Acepta tarjeta?", intent: "pay_card", step: "pay" },
    { say: "En efectivo", intent: "pay_cash", step: "pay" },
    { say: "Aquí tiene", intent: "here_you_go", step: "pay" },
    { say: "¿Puedo pagar con el celular?", intent: "pay_phone", step: "pay" },
    { say: "No, gracias, no necesito bolsa", intent: "no_bag", step: "bag" },
    { say: "Muchas gracias por la ayuda", intent: "thanks_help" },
    // tú to staff, Spain forms (vosotros, a Spain word, vale, constipado)
    { say: "¿Me das algo para la tos?", intent: "need_symptom" },
    { say: "¿Tenéis algo para la alergia?", intent: "need_symptom", slots: { symptom: "allergies" } },
    { say: "¿Tiene tiritas?", intent: "need_product", slots: { product: "bandaids" } },
    { say: "Ponme crema solar", intent: "need_product", slots: { product: "sunscreen" } },
    { say: "Vale, me lo llevo", intent: "accept_rec", step: "recommend" },
    { say: "Estoy constipado", intent: "symptom_state" },
    { say: "Pago con el móvil", intent: "pay_phone", step: "pay" },
    // never flip the meaning
    { say: "No tengo dolor de cabeza", step: "need", intent: "none", not: ["symptom_state", "need_symptom"] },
    { say: "No quiero ibuprofeno", step: "need", intent: "not_product", not: ["need_product", "accept_rec"] },
    { say: "No me duele la cabeza, me duele la garganta", intent: "symptom_state", slots: { symptom: "sore_throat" } },
    { say: "Ibuprofeno no, mejor paracetamol", intent: "change_product", step: "recommend", slots: { product: "acetaminophen" }, not: ["need_product"] },
    { say: "No me lo llevo", intent: "decline_rec", step: "recommend", not: ["accept_rec"] },
    { say: "No quiero el genérico", intent: "generic_ans", not: ["ask_cheaper"] },
    { say: "Nunca lo he tomado", intent: "first_time", step: "dosage", not: ["not_first"] },
    { say: "No traigo efectivo", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "Con tarjeta no, en efectivo", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "Pagué con tarjeta", step: "pay", intent: "none", not: ["pay_card", "pay_cash", "here_you_go"] },
    { say: "Se me olvidó la receta", intent: "no_rx_paper", step: "rx_paper", not: ["hand_over", "hand_over_ctx"] },
    { say: "No quiero ir al doctor", intent: "no_doctor", not: ["go_doctor"] },
    { say: "No estoy tomando ningún medicamento", intent: "meds_ans", step: "meds", not: ["meds_ctx"] },
    { say: "No necesito nada más", intent: "more_no", step: "more", not: ["need_product"] },
    // review probes: more symptoms, aspirin, the doctor's door, allergy negations
    { say: "Ando crudo", intent: "symptom_state", step: "need" },
    { say: "Tengo resaca", intent: "symptom_state", slots: { symptom: "hangover" } },
    { say: "Quiero aspirinas", intent: "need_product", slots: { product: "aspirin" } },
    { say: "Tengo náuseas", intent: "symptom_state", slots: { symptom: "upset_stomach" } },
    { say: "¿Qué tiene para la gripa?", intent: "need_symptom", slots: { symptom: "cold" } },
    { say: "No tengo gripa, tengo alergia", intent: "symptom_state", slots: { symptom: "allergies" } },
    { say: "No, a la penicilina no", intent: "allergy_ans", step: "allergy", not: ["allergy_ctx"] },
    { say: "No soy alérgico a la penicilina", intent: "allergy_ans", step: "allergy" },
    { say: "Uy, la dejé en el hotel", intent: "no_rx_paper", step: "rx_paper", not: ["hand_over", "hand_over_ctx"] },
    { say: "¿Lo tomo antes o después de comer?", intent: "ask_food" },
    { say: "¿No da sueño?", intent: "ask_drowsy" },
    // review: past tense, questions and corrections never order, pay or choose
    { say: "Ya tomé paracetamol pero no me hizo nada", intent: "meds_ans", step: "meds", not: ["need_product", "accept_rec"] },
    { say: "Solo una pastilla para la presión", intent: "meds_ans", step: "meds" },
    { say: "No, ninguna alergia", intent: "allergy_ans", step: "allergy" },
    { say: "Las curitas no, gracias", intent: "not_product", step: "dosage", not: ["need_product"], slots: { product: "bandaids" } },
    { say: "Ya fui al doctor", intent: "no_doctor", not: ["go_doctor"] },
    { say: "¿Cuál es el más barato?", intent: "generic_q", not: ["generic_ans", "generic_ctx"] },
    { say: "No, de patente no", intent: "generic_ans", not: ["ask_cheaper"] },
    { say: "Tome doscientos", intent: "here_you_go", step: "pay", slots: { price: 20000 } },
    { say: "¿Necesito receta para la amoxicilina?", intent: "ask_rx_needed", not: ["need_product"] },
    { say: "No, solo vengo por un bloqueador", intent: "need_product", slots: { product: "sunscreen" }, not: ["rx_pickup"] },
    { say: "Si no se me quita, voy al doctor", step: "dosage", intent: "none", not: ["go_doctor"] },
    // lead's check: a no before "para la presión", numbers counted (never "dosis"), bills, corrections
    { say: "No tomo nada para la presión", intent: "meds_ans", step: "meds", not: ["meds_ctx"] },
    { say: "No tengo la presión alta", intent: "meds_ans", step: "meds" },
    { say: "Deme dos cajas de paracetamol", intent: "need_product", step: "need", slots: { product: "acetaminophen" }, not: ["ask_dosage", "accept_rec"] },
    { say: "Me da dos protectores solares", intent: "need_product", slots: { product: "sunscreen" }, not: ["ask_dosage", "accept_rec"] },
    { say: "Sí, deme dos", intent: "accept_rec", step: "recommend", not: ["ask_dosage"] },
    { say: "Aquí tiene un billete de quinientos", intent: "here_you_go", step: "pay", slots: { price: 50000 } },
    { say: "Mejor en efectivo", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "No, solo a la aspirina", intent: "allergy_ans", step: "allergy" },
    { say: "No, mejor el genérico", intent: "generic_ans", not: ["decline_rec"] },
    { say: "Ya le pagué", step: "pay", intent: "none", not: ["pay_card", "pay_cash", "here_you_go"] },
    // audit (5 Nov 2026): cramps and dizziness, other medicines, who it's for, side questions at the counter
    { say: "Tengo cólicos", intent: "symptom_state", step: "need", slots: { symptom: "cramps" } },
    { say: "¿Tiene algo para el mareo?", intent: "need_symptom", step: "need", slots: { symptom: "dizzy" } },
    { say: "Tomo otro medicamento", intent: "meds_ans", step: "meds", not: ["meds_ctx"] },
    { say: "Para el corazón", intent: "meds_ctx", step: "meds" },
    { say: "No tomo nada para el corazón", intent: "meds_ans", step: "meds", not: ["meds_ctx"] },
    { say: "Sí, el medicamento es para mí", intent: "who_ans", step: "who" },
    { say: "Es para mi hijo", intent: "who_ans", step: "dosage", not: ["ask_kids"] },
    { say: "¿Se le puede poner a los niños?", intent: "ask_kids", step: "dosage" },
    { say: "Más o menos", intent: "first_time", step: "dosage", not: ["g_howareyou_bad", "not_first"] },
    { say: "¿Aceptan dólares?", intent: "ask_dollars", step: "pay", not: ["pay_cash", "pay_card", "here_you_go"] },
    { say: "¿Tiene terminal?", intent: "pay_card", step: "pay" },
    { say: "¿Me da el ticket?", intent: "ask_receipt", step: "pay", not: ["accept_rec", "need_product"] },
    { say: "¿A qué hora cierran?", intent: "ask_hours", step: "pay", not: ["doctor_q"] },
    { say: "Vengo con una receta", intent: "rx_pickup", step: "need" },
    { say: "De marca, por favor", intent: "generic_ans", not: ["ask_cheaper"] },
    // not understood
    { say: "banana jarabe ventana", intent: "none" },
    { say: "Mi perro come curitas azules", intent: "none" },
    { say: "Quiero aprender a bailar salsa", intent: "none" },
  ],

  sims: [
    { name: "a headache: ibuprofen, generic, how to take it, card",
      turns: ["¡Buenas tardes! ¿Tiene algo para el dolor de cabeza?", "Sí, me lo llevo", "El genérico, por favor", "¿Cada cuánto se toma?", "¿Da sueño?", "Con tarjeta", "¡Gracias, hasta luego!"],
      auto: omit(AUTO, ["need", "recommend", "generic_q", "dosage", "pay"]), expect: { complete: true, state: { product: "ibuprofen", paid: true, payMethod: "card" } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askAllergy = false; s.askMeds = false; s.volunteer = false; } },
    { name: "a cold with blood-pressure pills: questions, a change of mind, Band-Aids, cash",
      turns: ["Creo que me está dando gripa", "Desde ayer", "Tomo pastillas para la presión", "¿Necesito receta?", "¿Da sueño?", "Mejor paracetamol", "El genérico",
        "¿Cuántas al día?", "También unas curitas", "Es todo, gracias", "En efectivo", "Aquí tiene doscientos", "¡Gracias por la ayuda!"],
      auto: omit(AUTO, ["need", "howlong", "meds", "recommend", "generic_q", "more", "pay"]),
      expect: { complete: true, state: { symptom: "cold", meds: "bp", product: "acetaminophen", paid: true, payMethod: "cash" } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askHowLong = true; s.askMeds = true; s.askMore = true; s.askAllergy = false; s.askWho = false; s.volunteer = false; } },
    { name: "a prescription: amoxicillin, generic, alcohol, card",
      turns: ["Buenos días, vengo a surtir una receta", "Aquí está", "Genérica", "No", "¿Puedo tomar alcohol?", "¿Cuánto es?", "Con tarjeta", "Gracias, adiós"],
      auto: omit(AUTO, ["need", "rx_paper", "generic_q", "allergy", "pay"]), expect: { complete: true, state: { mode: "rx", stamped: true, allergy: "none", paid: true } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askAllergy = true; } },
    { name: "a cough for two weeks (twist): the doctor next door, then syrup for now",
      turns: ["Tengo mucha tos", "Desde hace dos semanas", "¿Cuánto cuesta la consulta?", "No, gracias", "Sí, está bien", "¿Cómo se toma?", "Con tarjeta", "Gracias"],
      auto: omit(AUTO, ["need", "howlong", "doctor_q", "recommend", "dosage", "pay"]), expect: { complete: true, state: { long: true, doctorOffered: true, product: "cough_syrup", paid: true } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askHowLong = true; s.askWho = false; s.askMeds = false; s.askAllergy = false; s.volunteer = false; } },
    { name: "an antibiotic without a prescription (twist): off to the doctor, no purchase",
      turns: ["¿Me vende amoxicilina?", "¿Cuánto cuesta la consulta?", "Sí, ¿dónde está?", "¡Gracias!"],
      auto: omit(AUTO, ["need", "doctor_q"]), expect: { complete: false, state: { decision: "doctor", wantsRx: true } },
      setup: (s) => { s.rxPrompt = false; } },
    { name: "an antibiotic without a prescription: no doctor, something for the throat",
      turns: ["Necesito un antibiótico", "No, gracias", "Me duele la garganta", "Sí, está bien", "No, ¿cómo se toma?", "Efectivo", "Aquí tiene", "Gracias"],
      auto: omit(AUTO, ["need", "doctor_q", "recommend", "dosage", "pay"]), expect: { complete: true, state: { wantsRx: true, product: "lozenges", paid: true } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askWho = false; s.askHowLong = false; s.askMeds = false; s.askAllergy = false; s.volunteer = false; } },
    { name: "the brand-name one is out (twist): the generic",
      turns: ["¿Tiene paracetamol?", "¿Cuánto cuesta?", "¿Cómo se toma?", "Tarjeta", "Adiós"],
      auto: omit(AUTO, ["need", "dosage", "pay"]), expect: { complete: true, state: { product: "acetaminophen", storeBrandUsed: true, paid: true } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = true; s.volunteer = false; } },
    { name: "a returning customer with a prescription (twist), penicillin allergy",
      turns: ["Sí, aquí está la receta", "De patente", "Sí, soy alérgico a la penicilina", "Bueno, gracias. Adiós"],
      auto: omit(AUTO, ["rx_prompt", "generic_q", "allergy"]), expect: { complete: false, state: { mode: "rx", allergy: "pen", decision: "doctor" } },
      setup: (s) => { s.rxPrompt = true; s.storeBrand = false; s.askAllergy = true; } },
    { name: "a returning customer without a prescription (twist): sunburn",
      turns: ["No, me quemé con el sol", "Sí", "¿Se puede tomar alcohol?", "Con tarjeta", "Gracias"],
      auto: omit(AUTO, ["rx_prompt", "recommend", "pay"]), expect: { complete: true, state: { symptom: "sunburn", product: "aloe", paid: true } },
      setup: (s) => { s.rxPrompt = true; s.storeBrand = false; s.askWho = false; s.askHowLong = false; s.askMeds = false; s.askAllergy = false; s.askMore = false; } },
    { name: "short answers",
      turns: ["Me duele la garganta", "Sí", "No", "Sí", "No", "Tarjeta", "No", "Gracias"],
      auto: omit(AUTO, ["need", "who", "meds", "recommend", "dosage", "pay", "bag"]), expect: { complete: true, state: { forWho: "me", meds: "none", product: "lozenges", bag: false } },
      setup: (s) => { s.rxPrompt = false; s.askWho = true; s.askHowLong = false; s.askMeds = true; s.askAllergy = false; s.askMore = false; s.askBag = true; s.volunteer = false; } },
    { name: "feeling sick: symptoms asked, for someone else",
      turns: ["No me siento bien", "La cabeza y el estómago", "No", "Para mi mamá", "Sí, está bien", "El genérico", "¿Cómo se toma?", "¿Acepta tarjeta?", "Gracias"],
      auto: omit(AUTO, ["need", "sick_q", "who", "who_q", "recommend", "generic_q", "dosage", "pay"]), expect: { complete: true, state: { symptom: "headache", forWho: "adult", paid: true } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askWho = true; s.askHowLong = false; s.askMeds = false; s.askAllergy = false; s.askMore = false; s.volunteer = false; } },
    { name: "declines the medicine and the other one (no purchase)",
      turns: ["¿Tiene algo para la garganta?", "No, gracias", "No, gracias", "Adiós"],
      auto: omit(AUTO, ["need", "recommend", "alt"]), expect: { complete: false, state: { decision: "none" } },
      setup: (s) => { s.rxPrompt = false; s.askWho = false; s.askHowLong = false; s.askMeds = false; s.askAllergy = false; } },
    { name: "for a child: fever, questions, brand-name, too little cash",
      turns: ["Mi hija tiene fiebre", "Sí, me lo llevo", "¿Cuál es la diferencia?", "De patente", "¿Cada cuánto se lo doy?", "En efectivo", "Aquí tiene cincuenta", "Ah, perdón, aquí tiene cien", "Gracias"],
      auto: omit(AUTO, ["need", "recommend", "generic_q", "dosage", "pay"]), expect: { complete: true, state: { forWho: "child", product: "acetaminophen", paid: true } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askWho = false; s.askHowLong = false; s.askMeds = false; s.askAllergy = false; s.askMore = false; s.volunteer = false; } },
    { name: "review: questions and polite closings never buy; a switch and an extra say the total again",
      turns: ["Me duele la cabeza", "¿Cuánto cuesta el genérico?", "¿Y el genérico?", "Está bien, gracias", "Sí, me lo llevo", "De patente", "¿Cómo se toma?",
        "¿Hay algo más barato?", "Sí", "También unas curitas", "Con tarjeta", "Gracias"],
      auto: omit(AUTO, ["need", "recommend", "generic_q", "dosage", "pay"]),
      expect: { complete: true, state: { product: "ibuprofen", paid: true, payMethod: "card", totalSaid: 8000 } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askWho = false; s.askHowLong = false; s.askMeds = false; s.askAllergy = false; s.askMore = false; s.volunteer = false; } },
    { name: "review: an ambiguous brand answer is asked again; cash in two goes",
      turns: ["¿Tiene loratadina?", "Genérico no, de patente", "De patente", "No", "Efectivo", "Aquí tiene cien", "Aquí tiene otros cincuenta", "Gracias"],
      auto: omit(AUTO, ["need", "generic_q", "dosage", "pay"]),
      expect: { complete: true, state: { product: "allergy_medicine", paid: true, payMethod: "cash", cashIn: 10000 } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askMore = false; s.volunteer = false; } },
    { name: "lead: two boxes; a no-comma brand answer is asked again; a no to the switch keeps the brand-name one",
      turns: ["Deme dos cajas de paracetamol", "No, el genérico", "No, mejor el de patente", "No", "¿Hay algo más barato?", "No, el de patente", "Con tarjeta", "Gracias"],
      auto: omit(AUTO, ["need", "generic_q", "dosage", "pay"]),
      expect: { complete: true, state: { product: "acetaminophen", gen: { acetaminophen: false }, qty: { acetaminophen: 2 }, totalSaid: 13000, paid: true, payMethod: "card" } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askMore = false; s.askBag = false; s.volunteer = false; } },
    { name: "lead: by voice; no blood-pressure pills; every bill counts; after paying, more is a second sale and a paid one isn't switched",
      turns: ["me duele la cabeza", "no tomo nada para la presion", "y el generico", "si el generico", "no", "en efectivo", "aqui tiene veinte", "aqui tiene cincuenta",
        "me da tambien unas curitas", "mejor el de patente", "aqui tiene cincuenta", "gracias"],
      auto: omit(AUTO, ["need", "meds", "recommend", "generic_q", "dosage", "pay"]),
      expect: { complete: true, state: { meds: "none", product: "ibuprofen", gen: { ibuprofen: true }, paid: true, paidSum: 8000, givenIds: { 0: "ibuprofen", 1: "bandaids" } } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askWho = false; s.askHowLong = false; s.askMeds = true; s.askAllergy = false; s.askMore = false; s.askBag = false; s.volunteer = false; } },
    { name: "review: a week of fever, a plain yes to the doctor (nothing bought)",
      turns: ["Tengo fiebre", "Hace una semana", "Sí", "Gracias"],
      auto: omit(AUTO, ["need", "howlong", "doctor_q"]), expect: { complete: false, state: { decision: "doctor", long: true } },
      setup: (s) => { s.rxPrompt = false; s.askWho = false; s.askHowLong = true; s.askMeds = false; s.askAllergy = false; } },
    // audit (5 Nov 2026): the advice read end to end
    { name: "audit: an aspirin allergy: acetaminophen, and ibuprofen asked for anyway is turned down",
      turns: ["Me duele la cabeza", "Soy alérgica a la aspirina", "Mejor deme ibuprofeno", "Sí, está bien", "El genérico", "¿Cómo se toma?", "Con tarjeta", "Gracias"],
      auto: omit(AUTO, ["need", "allergy", "recommend", "generic_q", "dosage", "pay"]),
      expect: { complete: true, state: { allergy: "nsaid", product: "acetaminophen", paid: true, paidSum: 2500 } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askWho = false; s.askHowLong = false; s.askMeds = false; s.askAllergy = true; s.askMore = false; s.askBag = false; s.volunteer = false; } },
    { name: "audit: blood-pressure pills: a no to acetaminophen is a no (ibuprofen is never the other one)",
      turns: ["Tengo fiebre", "Tomo pastillas para la presión", "No, gracias", "Adiós"],
      auto: omit(AUTO, ["need", "meds", "recommend", "alt"]), expect: { complete: false, state: { meds: "bp", decision: "none", altOffered: undefined } },
      setup: (s) => { s.rxPrompt = false; s.askWho = false; s.askHowLong = false; s.askMeds = true; s.askAllergy = false; } },
    { name: "audit: aspirin is never for a child",
      turns: ["Mi hija tiene fiebre", "No, mejor aspirina", "Sí", "El genérico", "¿Cada cuánto se lo doy?", "Con tarjeta", "Gracias"],
      auto: omit(AUTO, ["need", "recommend", "generic_q", "dosage", "pay"]),
      expect: { complete: true, state: { forWho: "child", product: "acetaminophen", paid: true, paidSum: 2500 } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askWho = false; s.askHowLong = false; s.askMeds = false; s.askAllergy = false; s.askMore = false; s.askBag = false; s.volunteer = false; } },
    { name: "audit: a cold, then a fever: the cold medicine already has acetaminophen in it",
      turns: ["Tengo gripa", "Sí, me lo llevo", "No", "También tengo fiebre", "No, es todo", "Con tarjeta", "Gracias"],
      auto: omit(AUTO, ["need", "recommend", "dosage", "more", "pay"]),
      expect: { complete: true, state: { product: "cold_medicine", paid: true, paidSum: 9500 } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askWho = false; s.askHowLong = false; s.askMeds = false; s.askAllergy = false; s.askMore = true; s.askBag = false; s.volunteer = false; } },
    { name: "audit: heart pills (¿Cuál?) take acetaminophen; dollars, the card machine, the receipt, the hours",
      turns: ["Me duele la cabeza", "Sí", "Para el corazón", "Sí", "El genérico", "No", "¿Aceptan dólares?", "¿Tiene terminal?", "¿Me da el ticket?", "¿A qué hora cierran?", "Gracias, adiós"],
      auto: omit(AUTO, ["need", "meds", "recommend", "generic_q", "dosage", "pay"]),
      expect: { complete: true, state: { meds: "risk", product: "acetaminophen", paid: true, payMethod: "card" } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askWho = false; s.askHowLong = false; s.askMeds = true; s.askAllergy = false; s.askMore = false; s.askBag = false; s.volunteer = false; } },
    { name: "audit: an acetaminophen allergy: ibuprofen for the fever",
      turns: ["Tengo fiebre", "Soy alérgico al paracetamol", "Sí", "El genérico", "¿Cómo se toma?", "Con tarjeta", "Gracias"],
      auto: omit(AUTO, ["need", "allergy", "recommend", "generic_q", "dosage", "pay"]),
      expect: { complete: true, state: { allergy: "para", product: "ibuprofen", paid: true, paidSum: 3500 } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askWho = false; s.askHowLong = false; s.askMeds = false; s.askAllergy = true; s.askMore = false; s.askBag = false; s.volunteer = false; } },
    { name: "audit: acetaminophen didn't help: ibuprofen instead; cash short",
      turns: ["Tengo fiebre", "Ya tomé paracetamol, pero no me hizo nada", "Sí", "El genérico", "No", "Efectivo", "Aquí tiene veinte", "Aquí tiene otros cien", "Gracias"],
      auto: omit(AUTO, ["need", "meds", "recommend", "generic_q", "dosage", "pay"]),
      expect: { complete: true, state: { took: "acetaminophen", product: "ibuprofen", paid: true, cashIn: 2000 } },
      setup: (s) => { s.rxPrompt = false; s.storeBrand = false; s.askWho = false; s.askHowLong = false; s.askMeds = true; s.askAllergy = false; s.askMore = false; s.askBag = false; s.volunteer = false; } },
  ],
};

// ---------------------------------------------------------------------------

/** "Está bien, gracias" / "Vale, gracias": could be a yes or a polite no (rule 17). */
const POLITE = /^[\s¡¿]*(est[aá] bien|vale|ok(ay)?|bueno|muy bien)[\s,.!]+(muchas )?gracias[\s.!]*$/i;

/** "¿Y el genérico?" is a question, also by voice (no question mark) when it starts with "y" and orders nothing. */
const ORDER = /\b(deme|d[eé]me(lo|la|los|las)|me da|me pone|ponme|quiero|quisiera|me (lo |la |los |las )?llevo|por favor)\b/i;
const asksAbout = (h: string) => (/\?/.test(h) || /^[\s¿¡]*y\s/i.test(h)) && !ORDER.test(h);

/** The total he said is still the total (nothing added or switched since). */
const totalFresh = (c: Ctx) => c.s.totalSaid === due(c);
function sayTotal(c: Ctx) { c.s.totalSaid = due(c); c.say("total", { price: due(c) }); }

/** Something more after paying ("¿Me da también unas curitas?"): a second sale; the pay step asks for the rest. */
function reopenSale(c: Ctx) {
  c.s.paid = false;
  c.s.payMethod = undefined; c.s.cashIn = undefined; c.s.totalSaid = undefined;
  c.s.__finished = false;
}
/** A second sale whose new things were all put back: nothing more to pay. */
function settle(c: Ctx) { if (!c.s.paid && c.s.paidSum !== undefined && due(c) <= 0) c.s.paid = true; }

/** "¿Hay algo más barato?" with the brand-name one already chosen: "¿Quiere el genérico, entonces?" */
function switchPending(id: string): Pending {
  const sw = (cc: Ctx) => { gen(cc)[id] = true; cc.say(at(id).pro === "la" ? "gen_ok_f" : "gen_ok"); };
  return { id: "switch_q", optional: true, expects: ["generic_ans", "accept_ctx", "decline_rec", "switch_ctx"], hints: ["generic", "g_yesno"],
    suggest: [{ lt: "Say yes or no", hint: "g_yesno" }],
    on: {
      switch_ctx: (cc) => { sw(cc); },
      // "No, el de patente" (no comma, #amb): the no answers his question, so it stays as it is
      generic_ans: (cc, _sl, sg) => { if (sg.tags.includes("pat") || sg.tags.includes("notgen") || sg.tags.includes("amb")) cc.say("ok"); else sw(cc); },
      accept_ctx: (cc) => { if (POLITE.test(cc.heard)) { cc.say("ok"); return; } sw(cc); },
      decline_rec: (cc) => { cc.say("ok"); },
    },
    yes: (cc) => { sw(cc); }, no: (cc) => { cc.say("ok"); },
    ask: (cc) => cc.say("switch_q") };
}

/** Everything is on the counter and the total can be said (the pay step's condition). */
const payReady = (c: Ctx) => !!pharmacy.steps.find((x) => x.id === "pay")!.when!(c) && !c.s.paid;

/** At the goodbye the learner asks for something after all: the visit goes on (after paying, a second sale:
 *  addProduct reopens it and the pay step asks for the rest). */
function reopen(c: Ctx, run: () => void): boolean | void {
  if (c.s.paid) { run(); return; }
  if (c.s.decision === "doctor") return false;
  c.s.decision = undefined;
  c.s.__finished = false;
  run();
}

/** The pharmacist's optional questions (who, how long, other medicines, allergies) still open. */
const openQuestions = (c: Ctx) => (c.s.askWho && !c.s.forWho) || (c.s.askHowLong && c.s.days === undefined) || (c.s.askMeds && !c.s.meds) || (c.s.askAllergy && !c.s.allergy);

function symptomFromTags(tags: string[]): string | undefined {
  for (const tg of tags) if (tg.startsWith("s_")) return tg.slice(2);
  return undefined;
}

function daysFromTags(tags: string[], slots: any): number | undefined {
  for (const tg of tags) { const m = tg.match(/^d(\d+)$/); if (m) return Number(m[1]); }
  const n = slots?.n;
  if (typeof n === "number") {
    if (tags.includes("unit_w")) return n * 7;
    if (tags.includes("unit_h")) return 0;
    return n;
  }
  return undefined;
}

/** How long: a week or more brings the twist, the doctor next door. */
function setDays(c: Ctx, d: number, reply = false) {
  c.s.days = d;
  if (d >= 7 && !c.s.long) {
    c.s.long = true;
    c.twist("see_doctor");
    offerDoctor(c, ["long_time", "see_doctor_soon"]);
    return;
  }
  if (reply) c.say("ack");
}

function setSymptom(c: Ctx, s: string | undefined) {
  if (!s) return;
  if (c.s.mode === "rx") { c.say("ack"); return; }
  c.s.rxOffer = false;
  if (!firstThisTurn(c, "symptom") && c.s.symptom) return; // a second symptom in the same sentence: keep the first
  // a new symptom once a medicine is on the counter: his recommendation for it, as an extra
  if (product(c) && c.s.symptom && c.s.symptom !== s) {
    c.s.symptom = s;
    const p = recommendation(c);
    if (!p || basket(c).includes(p)) { c.say("ack"); return; }
    // fever on top of a cold: the cold medicine already has acetaminophen in it (never both)
    if (p === "acetaminophen" && basket(c).includes("cold_medicine")) { c.say("cold_has_para"); return; }
    c.say("rec", { X: p }); sayRecQ(c, p);
    c.expect(altPending(p, false));
    return;
  }
  const changed = c.s.symptom && c.s.symptom !== s;
  c.s.symptom = s;
  if (changed && !product(c)) { c.s.offer = undefined; c.s.recSaid = false; c.s.recQSaid = false; }
  if (!changed && !c.s.sorrySaid) { c.s.sorrySaid = true; c.say("sorry_symptom"); }
  else if (!changed) c.say("ack");
}

/** "¿Es para usted?" — "No": who is it for? */
function askWhoFor(c: Ctx) {
  c.say("ask_who_q");
  c.expect({ id: "who_q", expects: ["who_ans"], hints: ["who"], suggest: [{ lt: "Say who it's for", hint: "who" }],
    on: { who_ans: (cc, sl, sg) => { pharmacy.handlers.who_ans(cc, sl, sg); } },
    ask: (cc) => cc.say("ask_who_q") });
}

function startRx(c: Ctx) {
  c.s.mode = "rx";
  c.s.rxOffer = false;
}

/** He reads the prescription: amoxicillin, then brand-name or generic. */
function handOver(c: Ctx) {
  if (c.s.rxRead) return;
  c.s.rxRead = true;
  c.s.mode = "rx";
  c.s.product = "antibiotic";
  if (!basket(c).includes("antibiotic")) { if (c.s.paid) reopenSale(c); basket(c).push("antibiotic"); } // (after paying: a second sale)
  c.event("give", { item: "prescription", to: "pharmacist" });
  c.say("rx_read");
  c.s.dosageGiven = true;
  // the penicillin question (if he asks it) comes first, then brand-name or generic (step rx_brand)
}

function noRxPaper(c: Ctx) {
  c.s.mode = "otc";
  c.s.wantsRx = true;
  c.s.product = undefined;
  const i = basket(c).indexOf("antibiotic"); if (i >= 0) basket(c).splice(i, 1);
  offerDoctor(c, ["rx_need_paper"]);
}

/** Asked for an antibiotic without a prescription. */
function refuseRx(c: Ctx) {
  c.s.wantsRx = true;
  offerDoctor(c, ["antibiotic_rx"]);
}

/** Amoxicillin and a penicillin allergy: back to the doctor. */
function rxPen(c: Ctx) {
  c.say("rx_pen");
  const i = basket(c).indexOf("antibiotic"); if (i >= 0) basket(c).splice(i, 1);
  c.s.product = undefined;
  if (!basket(c).length) c.s.decision = "doctor";
}

function doctorPending(): Pending {
  const noDoc = (cc: Ctx) => { cc.s.doctorNo = true; };
  return { id: "doctor_q", expects: ["go_doctor", "doctor_q", "decline_rec", "no_doctor", "doctor_ctx"], hints: ["doctor", "g_yesno"],
    suggest: [{ lt: "Say whether you'll see the doctor", hint: "doctor" }, { lt: "Say yes or no", hint: "g_yesno" }],
    on: {
      go_doctor: (cc) => { goDoctor(cc); },
      decline_rec: (cc) => { noDoc(cc); cc.say("ack"); },
      no_doctor: (cc) => { noDoc(cc); cc.say("ack"); },
      doctor_ctx: (cc, sl, sg) => { pharmacy.handlers.doctor_ctx(cc, sl, sg); },
      // "Sí" / "Sí, está bien" answers his question, not the recommendation still open behind it
      accept_ctx: (cc) => { if (POLITE.test(cc.heard)) { cc.say("doctor_ask_again"); cc.expect(doctorPending()); return; } goDoctor(cc); },
      need_symptom: (cc, sl, sg) => { noDoc(cc); pharmacy.handlers.need_symptom(cc, sl, sg); },
      symptom_state: (cc, sl, sg) => { noDoc(cc); pharmacy.handlers.symptom_state(cc, sl, sg); },
      need_product: (cc, sl, sg) => { if (at(last(sl.product) ?? "").rx) return false; noDoc(cc); pharmacy.handlers.need_product(cc, sl, sg); },
      rx_pickup: (cc, sl, sg) => { pharmacy.handlers.rx_pickup(cc, sl, sg); },
      more_no: (cc) => { noDoc(cc); cc.say("ack"); },
    },
    yes: (cc) => { goDoctor(cc); },
    no: (cc) => { noDoc(cc); cc.say("ack"); },
    ask: (cc) => cc.say("doctor_ask_again") };
}

/** The consultorio next door (twist): said once, then the question. */
function offerDoctor(c: Ctx, first: string[]) {
  for (const l of first) c.say(l);
  if (!c.s.doctorOffered) { c.s.doctorOffered = true; c.twist("consultorio"); c.say("consultorio"); }
  if (c.s.decision) return;
  c.say("doctor_ask");
  c.expect(doctorPending());
}

function goDoctor(c: Ctx) {
  if (c.s.decision === "doctor" || c.s.doctorLater) { c.say("ack"); return; }
  c.say("go_doctor_ok");
  if (basket(c).length && !c.s.paid) c.s.doctorLater = true; // what's on the counter is paid first
  else if (c.s.paid) c.s.doctorLater = true;
  else c.s.decision = "doctor";
}

/** "¿De patente o genérico?" (or the twist: the brand-name one is out). */
function askGenericOrTwist(c: Ctx, id: string) {
  if (!at(id).generic || gen(c)[id] !== undefined) { afterGeneric(c, id, false); return; }
  // the brand choice of this turn is settled here: a choice said in the same breath ("si el generico", one piece
  // for the yes and another for the choice) is taken now, and generic_ans adds nothing after it (no question
  // asked and answered at once, then asked again)
  firstThisTurn(c, "genq");
  if (c.s.storeBrand && !c.s.storeBrandUsed) {
    c.s.storeBrandUsed = true;
    c.twist("store_brand");
    c.say("out_brand");
    gen(c)[id] = true;
    afterGeneric(c, id, false);
    return;
  }
  const said = choiceSaid(c.heard);
  if (said !== undefined) {
    gen(c)[id] = said;
    c.say((said ? "gen_ok" : "pat_ok") + (c.s.mode === "rx" ? "_rx" : at(id).pro === "la" ? "_f" : ""));
    afterGeneric(c, id, true);
    return;
  }
  c.s.genFor = id;
  c.s.genAsked = true;
  c.say("generic_q");
  c.expect(genericPending());
}

/** "Sí, el genérico" / "Me lo llevo, de patente": one clear choice in the words (no "no", no question, not both). */
function choiceSaid(h: string): boolean | undefined {
  const g = /gen[eé]ric[oa]/i.test(h), p = /patente|de marca|\boriginal\b/i.test(h);
  if (g === p || /\bno\b|\?/i.test(h) || asksAbout(h) || /cu[aá]nto|precio|a c[oó]mo|diferencia/i.test(h)) return undefined;
  return g;
}

function genericPending(): Pending {
  const again = (cc: Ctx) => { cc.say("generic_again"); cc.expect(genericPending()); };
  return { id: "generic_q", expects: ["generic_ans", "generic_ctx", "generic_q", "ask_price", "ask_cheaper"], hints: ["generic", "ask"],
    suggest: [{ lt: "Choose brand-name or generic", hint: "generic" }, { lt: "Ask about the medicine", hint: "ask" }],
    on: {
      generic_ans: (cc, sl, sg) => { pharmacy.handlers.generic_ans(cc, sl, sg); },
      generic_ctx: (cc, sl, sg) => { pharmacy.handlers.generic_ctx(cc, sl, sg); },
      // "No, gracias, así está bien": he puts it back
      decline_rec: (cc) => { dropPending(cc); },
      not_product: (cc) => { dropPending(cc); },
    },
    yes: again, no: again,
    ask: (cc) => cc.say("generic_again") };
}

/** No to the brand question ("Mejor no, gracias"): that medicine goes back on the shelf. */
function dropPending(c: Ctx) {
  const id = c.s.genFor as string | undefined;
  c.s.genFor = undefined;
  if (!id || c.s.mode === "rx") { c.say("rec_none"); if (id) { c.s.decision = "none"; } return; }
  const i = basket(c).indexOf(id); if (i >= 0) basket(c).splice(i, 1);
  setQty(c, id, 1);
  if (product(c) === id) { c.s.product = basket(c)[0]; c.s.dosageGiven = !c.s.product || !!at(c.s.product).noDose; }
  c.say("rec_none");
  settle(c);
  if (!basket(c).length) c.s.decision = "none";
}

function chooseGeneric(c: Ctx, id: string, g: boolean) {
  gen(c)[id] = g;
  const asked = c.s.genFor === id;
  c.s.genFor = undefined;
  const fem = at(id).pro === "la";
  c.say((g ? "gen_ok" : "pat_ok") + (c.s.mode === "rx" ? "_rx" : fem ? "_f" : ""));
  if (asked) afterGeneric(c, id, true);
}

/** After the brand question: "Aquí tiene" (said already by gen_ok/pat_ok), and the stamp for a prescription. */
function afterGeneric(c: Ctx, id: string, handed: boolean) {
  if (c.s.mode === "rx" && id === "antibiotic") {
    if (!c.s.stamped) { c.s.stamped = true; c.say("rx_stamp"); c.say("rx_finish"); c.say("rx_here"); }
    return;
  }
  if (!handed) c.say(plural(id) ? "here_pl" : "here_it_is");
}

/** "Ibuprofeno genérico" / "paracetamol de patente": the choice said with the product. */
function setGenFromTags(c: Ctx, id: string, tags: string[]) {
  if (!at(id).generic) return;
  if (tags.includes("gen")) gen(c)[id] = true;
  else if (tags.includes("pat")) gen(c)[id] = false;
}

function genPrices(c: Ctx, id: string) {
  c.say("generic_prices", { price: at(id).price, amount: at(id).generic });
}

function addProduct(c: Ctx, id: string) {
  if (c.s.paid && !basket(c).includes(id)) reopenSale(c); // after paying: a second sale, never handed over unpaid
  if (!basket(c).includes(id)) basket(c).push(id);
  const cur = product(c);
  if (!cur) { c.s.product = id; c.s.dosageGiven = !!at(id).noDose; }
  else if (!at(cur).med && at(id).med) { c.s.product = id; c.s.dosageGiven = false; }
  // a cold medicine and acetaminophen both on the counter: never taken together (said once)
  if ((id === "cold_medicine" || id === "acetaminophen") && basket(c).includes("cold_medicine") && basket(c).includes("acetaminophen") && !c.s.paraWarned) {
    c.s.paraWarned = true;
    c.say("cold_para_warn");
  }
  askGenericOrTwist(c, id);
}

function acceptOffer(c: Ctx) {
  const p = c.s.offer ?? recommendation(c);
  if (!p) { noSafe(c); return; }
  c.s.offer = p;
  addProduct(c, p);
}

function declineOffer(c: Ctx) {
  const cur = c.s.offer ?? recommendation(c);
  const alt = safeAlt(c, cur); // (never ibuprofen right after "Con esa alergia, mejor no tome antiinflamatorios")
  if (alt && !c.s.altOffered) {
    c.s.altOffered = true;
    c.s.offer = alt;
    c.say("rec_alt", { X: alt });
    sayRecQ(c, alt);
    c.expect(altPending(alt, true));
    return;
  }
  c.say("rec_none");
  if (!product(c)) c.s.decision = "none";
}

/** An offer of one more product: the alternative after a no (`main`), or an extra for a second symptom. */
function altPending(alt: string, main: boolean): Pending {
  const take = (cc: Ctx) => { cc.s.offer = alt; if (main && !product(cc)) acceptOffer(cc); else { cc.say("product_ok"); addProduct(cc, alt); } };
  const refuse = (cc: Ctx) => { cc.say("rec_none"); if (main && !product(cc)) cc.s.decision = "none"; };
  return { id: main ? "alt" : "extra", expects: ["accept_rec", "accept_ctx", "need_product", "change_product", "decline_rec", "ask_price", "ask_drowsy", "ask_dosage"],
    hints: ["accept", "ask", "g_yesno"],
    suggest: [{ lt: "Take it, or ask for something else", hint: "accept" }, { lt: "Ask about the medicine", hint: "ask" }],
    on: {
      // "Sí, deme dos": two of them
      accept_rec: (cc, _sl, sg) => { const q = qtyFromTags(sg.tags); if (q > 1 && !basket(cc).includes(alt)) { setQty(cc, alt, q); cc.say(q === 3 ? "qty_three" : "qty_two"); } take(cc); },
      accept_ctx: (cc) => { if (POLITE.test(cc.heard)) { sayRecQ(cc, alt, true); cc.expect(altPending(alt, main)); return; } take(cc); },
      // "¿Tiene otra cosa?" is a question, not a no: there's nothing else, and the offer stays open
      other_option: (cc) => { cc.say("rec_nothing_else"); sayRecQ(cc, alt, true); cc.expect(altPending(alt, main)); },
      decline_rec: (cc) => { refuse(cc); },
      need_product: (cc, sl, sg) => { pharmacy.handlers.need_product(cc, sl, sg); },
      change_product: (cc, sl, sg) => { pharmacy.handlers.change_product(cc, sl, sg); },
      // "¿Cuánto es?" at his offer: that product's price, and the question again (rule 17)
      ask_price: (cc, sl, sg) => {
        if (sl.product) { pharmacy.handlers.ask_price(cc, sl, sg); return; }
        if (at(alt).generic && gen(cc)[alt] === undefined) genPrices(cc, alt); else cc.say("price_is", { price: priceOf(cc, alt) });
        sayRecQ(cc, alt, true); cc.expect(altPending(alt, main)); cc.hold();
      },
    },
    yes: (cc) => { take(cc); },
    no: (cc) => { refuse(cc); },
    ask: (cc) => sayRecQ(cc, alt, true) };
}

/** Something on the counter (not paid yet) that an allergy, other medicines or a child now rule out: acetaminophen
 *  instead, with the reason. */
function fixUnsafe(c: Ctx): boolean {
  const bad = basket(c).find((id) => !locked(c, id) && unsafeWhy(c, id));
  if (!bad) return false;
  swapToAceta(c, bad, unsafeWhy(c, bad)!);
  return true;
}

/** Asked for a medicine he has ruled out ("Mejor deme ibuprofeno" after an aspirin allergy, aspirin for a child): the
 *  reason, and acetaminophen (or ibuprofen) offered instead, unless it is on the counter already. */
function steerToAceta(c: Ctx, why: string) {
  c.say(why);
  const alt = safeAnalgesic(c);
  if (!alt) { if (!product(c)) noSafe(c); return; }
  if (basket(c).includes(alt)) return;
  if (alt !== "acetaminophen") c.say("rec", { X: alt });
  else if (why !== "kids_aspirin") c.say("switch_aceta"); // ("…para ellos, mejor paracetamol" says it already)
  c.s.offer = alt;
  if (!product(c) && c.s.symptom) { c.s.recSaid = true; c.s.recQSaid = false; return; } // the recommend step asks "¿Se lo doy?"
  sayRecQ(c, alt);
  c.expect(altPending(alt, !product(c)));
}

/** Nothing he can give safely (an allergy and other medicines rule out both painkillers): the doctor next door, and
 *  after a no to the doctor, nothing sold. */
function noSafe(c: Ctx) {
  if (c.s.decision) return;
  if (!c.s.doctorOffered) { offerDoctor(c, ["see_doctor_soon"]); return; }
  c.say("rec_none");
  if (!product(c)) c.s.decision = "none";
}

/** After a step's help settled it ("No sé"), the next open step (the global "no sé" holds the turn). */
function goOn(c: Ctx) {
  const st = pharmacy.steps.find((x) => (!x.when || x.when(c)) && !x.done(c));
  if (st) c.ask(st.id);
}

/** "Tomo otro medicamento": "¿Cuál?" ("Para el corazón", "Metformina", "No sé" answer it). */
function askWhichMed(c: Ctx) {
  c.say("ask_meds_which");
  c.expect({ id: "meds_which", optional: true, expects: ["meds_ans", "meds_ctx"], hints: ["meds"],
    suggest: [{ lt: "Say which medicine you take", hint: "meds" }],
    on: {
      meds_ans: (cc, sl, sg) => { pharmacy.handlers.meds_ans(cc, sl, sg); },
      meds_ctx: (cc, sl, sg) => { pharmacy.handlers.meds_ans(cc, sl, sg); },
    },
    ask: (cc) => cc.say("ask_meds_which") });
}

/** Aspirin allergy or blood-pressure pills with ibuprofen on the counter: acetaminophen instead. */
function swapToAceta(c: Ctx, from: string, reason: string) {
  const boxes = qtyOf(c, from); // the same number of boxes
  const i = basket(c).indexOf(from); if (i >= 0) basket(c).splice(i, 1);
  setQty(c, from, 1);
  if (c.s.genFor === from) c.s.genFor = undefined;
  c.s.product = undefined; c.s.dosageGiven = false;
  c.say(reason);
  // (an acetaminophen allergy: ibuprofen; neither: the doctor)
  const alt = safeAnalgesic(c);
  if (!alt) {
    c.s.offer = undefined;
    c.s.product = basket(c)[0]; c.s.dosageGiven = !c.s.product || !!at(c.s.product).noDose;
    settle(c);
    if (!basket(c).length) noSafe(c);
    return;
  }
  if (alt !== "acetaminophen") c.say("rec", { X: alt });
  else if (reason !== "kids_aspirin") c.say("switch_aceta");
  c.s.offer = alt;
  if (boxes > 1 && !basket(c).includes(alt)) setQty(c, alt, boxes);
  addProduct(c, alt);
}

/** Directions for the current product (the children's dose for a child). */
function giveDosage(c: Ctx) {
  const id = product(c);
  c.s.dosageGiven = true;
  if (!id) return;
  if (c.s.mode === "rx" && id === "antibiotic") { c.say("rx_read"); c.say("rx_finish"); return; }
  if (c.s.forWho === "child" && at(id).med) { c.say("kids_dose"); return; }
  for (const l of DOSE[id] ?? ["no_dose"]) c.say(l);
  if (id === "oral_serum") c.s.doctorSaid = true; // serum_water already says when to see a doctor
}
const DOSE: Record<string, string[]> = {
  ibuprofen: ["dose_ibuprofen", "max_three"], aspirin: ["dose_aspirin", "max_eight"], acetaminophen: ["dose_paracetamol", "max_six"], cough_syrup: ["dose_syrup", "syrup_cup"],
  lozenges: ["dose_lozenges", "max_eight"], cold_medicine: ["dose_cold", "cold_drowsy"], allergy_medicine: ["dose_allergy", "allergy_nondrowsy"],
  antacid: ["dose_antacid", "antacid_after"], oral_serum: ["dose_serum", "serum_water"], aloe: ["dose_aloe", "aloe_sun"], sunscreen: ["dose_sunscreen", "sunscreen_reef"],
  itch_cream: ["dose_itch", "itch_noscratch"], repellent: ["dose_repellent", "repellent_dusk"], vitamins: ["dose_vitamins"], bandaids: ["no_dose"],
};

/** Directions for a product that is only on offer (asked before deciding). */
function giveDosageFor(c: Ctx, id: string) {
  const keep = c.s.product, given = c.s.dosageGiven;
  c.s.product = id;
  giveDosage(c);
  c.s.product = keep;
  c.s.dosageGiven = given;
}

const REMIND = ["max_three", "max_six", "max_eight", "cold_drowsy", "serum_water"];
/** "Sí, ya lo he tomado": a short reminder of the limit. */
function knowsIt(c: Ctx) {
  const id = product(c);
  if (!id) { c.say("ack"); return; }
  c.s.dosageGiven = true;
  const lines = DOSE[id] ?? [];
  if (lines.length < 2 || c.s.forWho === "child" || !REMIND.includes(lines[1])) { c.say("ack"); return; }
  c.say("dose_reminder");
  c.say(lines[1]);
}

/** Paid for: the learner gets the items (at the end, or on "¡Gracias, adiós!" right after paying). */
function sold(c: Ctx) {
  if (!c.s.soldDone) { c.s.soldDone = true; c.complete(); }
  // (a second sale gives only what it added)
  const given = (c.s.givenIds as string[] | undefined) ?? [];
  const items = basket(c).filter((id) => !given.includes(id));
  if (!items.length) return;
  c.s.givenIds = [...given, ...items];
  c.event("give", { items });
}

function choosePay(c: Ctx, method: "card" | "cash" | "phone") {
  if (c.s.paid) return;
  c.s.payMethod = method;
  if (!totalFresh(c)) {
    if (!c.s.totalSaid || !payReady(c)) { c.say(method === "cash" ? "cash_ok" : "card_later"); return; }
    sayTotal(c); // something was added or switched after he said the total
  }
  if (method === "cash") { c.say("cash_ok"); return; } // he waits for the money
  finishPay(c, method);
}

function finishPay(c: Ctx, method: "card" | "cash" | "phone", given?: number) {
  if (c.s.paid) return;
  const amount = due(c);
  // a bill that doesn't cover it: he says what's missing and waits (never paid). Every bill handed over counts:
  // "Aquí tiene cincuenta" … "faltan $15" … "Aquí tiene cien" gets $85 back, the fifty included
  if (method === "cash" && given) {
    const sum = ((c.s.cashIn as number | undefined) ?? 0) + given;
    if (sum < amount) { c.s.payMethod = "cash"; c.s.cashIn = sum; c.say("short", { price: amount - sum }); c.hold(); return; }
    given = sum;
  }
  c.s.paid = true;
  c.s.payMethod = method;
  c.s.paidSum = total(c);
  c.s.paidIds = [...basket(c)];
  c.s.moreDone = true; // money handed over at "¿Algo más?" ends the list
  c.event("pay", { method, amount });
  if (method === "card") c.say("card_tap");
  else if (method === "phone") c.say("phone_ok");
  else if (given && given > amount) c.say("change_is", { price: given - amount });
  else c.say("change_back");
}

/** True the first time `key` comes up in this learner turn. */
const TURN = new WeakMap<object, Set<string>>();
function firstThisTurn(c: Ctx, key: string): boolean {
  let seen = TURN.get(c);
  if (!seen) TURN.set(c, (seen = new Set()));
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}
const markedThisTurn = (c: Ctx, key: string) => !!TURN.get(c)?.has(key);

export default pharmacy;
