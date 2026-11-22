import type { WordKind } from "@/game/road/wordKinds";

export const ROAD_FUNCTION_WORDS = new Set("a al de del el la las lo los un una unos unas y e o u en con sin por para que se me te le les nos su sus mi mis tu tus es soy son ser está están estoy hay he ha han era fue como muy más menos no sí yo tú él ella usted ustedes nosotros ellos este esta esto ese esa eso aquí ahí".split(" "));

const social = new Set("hola|buenas|buen día|buenos días|buenas tardes|buenas noches|adiós|hasta luego|nos vemos|gracias|muchas gracias|de nada|por favor|sí|no|claro|cómo no|con gusto|perfecto|excelente|está bien|muy bien|de acuerdo|qué bien|exacto|listo|adelante|permiso|con permiso|disculpe|perdón|órale|sale|vale".split("|"));
const determiner = /^(?:el|la|los|las|un|una|unos|unas|mi|mis|tu|tus|su|sus|este|esta|estos|estas|ese|esa|esos|esas|qué|otro|otra)$/u;
const adverb = /^(?:ahora|hoy|mañana|ayer|aquí|acá|ahí|allí|allá|luego|después|antes|siempre|nunca|todavía|también|tampoco|cerca|lejos|ya|bien|mal|despacio|derecho|recto)$/u;
const color = /^(?:blanc[oa]s?|negr[oa]s?|roj[oa]s?|amarill[oa]s?|verdes?|azul(?:es)?|gris(?:es)?|marrón|rosa|morad[oa]s?|café|naranja)$/u;
const number = /^(?:cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieci\w+|veinte|veinti\w+|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|mil)(?: |$)/u;

export function classifyRoadWord(word: string, gap: boolean, previous: string): WordKind | undefined {
  if (social.has(word)) return { role: gap ? "interjection" : "social" };
  if (number.test(word)) return { role: "number" };
  if (color.test(word)) return { role: "adjective", topic: "color" };
  if (adverb.test(word) || /mente$/u.test(word)) return { role: "adverb" };
  if (/^(?:a|al|de|del|en|por|para|con|sin) /u.test(word)) return { role: "prepositional phrase" };
  if (/^(?:cómo|cuándo|dónde|adónde|cuánto|qué|quién) /u.test(word)) return { role: "question" };
  if (determiner.test(word.split(" ")[0]) && word.includes(" ")) return { role: "noun phrase" };
  if (determiner.test(previous) || /(?:ción|sión|dad|tud|umbre)(?:es)?$/u.test(word)) return { role: "noun" };
  if (/(?:ado|ido|able|ible|oso|osa|osos|osas)$/u.test(word)) return { role: "adjective" };
  if (/(?:ar|er|ir)$/u.test(word)) return { role: "infinitive" };
  if (/(?:ando|iendo)$/u.test(word)) return { role: "gerund" };
}
