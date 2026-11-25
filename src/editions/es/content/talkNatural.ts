import type { AnchorKind, ClassifiedCue, TalkPersonality } from "@/game/talkNatural/contract";

const reserved: TalkPersonality = { armChance: 0.45, farewell: "yes" };
const expressive: TalkPersonality = { armChance: 0.70, farewell: "wave" };
const warm: TalkPersonality = { armChance: 0.55, farewell: "heart" };

const people: Record<string, TalkPersonality> = {
  walter: reserved, aaron: reserved, tienda: reserved,
  vinnie: { ...expressive, smallGreeting: true },
  queta: { ...expressive, directs: true },
  tona: { ...expressive, smallGreeting: true },
  mia: { ...warm, smallGreeting: true, quickSmile: true },
  marco_host: warm, marco: warm,
};

export function talkPersonality(id: string) {
  return people[id] ?? warm;
}

// Keep the accents until the polarity check: sí answers, si introduces a condition.
const farewell = /\b(?:adi[oó]s|hasta (?:luego|pronto|mañana|la pr[oó]xima)|nos vemos(?: pronto| luego| mañana)?|(?:que )?(?:le|te) vaya (?:muy )?bien|que (?:tenga[sn]?|pase[sn]?) (?:un (?:buen|bonito) d[ií]a|una (?:buena|bonita) (?:tarde|noche))|buen viaje|cu[ií]de(?:se|te))\b/;
const closingThanks = /^(?:(?:muchas )?gracias(?: por (?:venir|pasar))?|(?:buen )?provecho|que (?:lo|la) disfrute[sn]?)[.!¡\s]*$/;
const handoff = /\b(?:(?:aqu[ií]|ac[aá]|ah[ií]) (?:(?:lo |la |los |las )?(?:tiene[sn]?)|(?:lo|la|los|las) est[aá]n?|est[aá]n? (?:su|sus|tu|tus))|(?:ah[ií]|aqu[ií]) (?:le|te) va[n]?|(?:le|te) (?:dejo|entrego|doy|paso)|tom[ae](?=\s*[,!.]))\b/;
const serve = /\b(?:le|te) (?:ofrezco|traigo|puedo traer|sirvo|puedo servir)\b/;
const invitation = /\b(?:(?:gusta|gustar[ií]a|apetece) (?:un[ao]?s?|algo|m[aá]s)|(?:quiere[sn]?|desea[sn]?) (?:un[ao]?|algo|otro|otra|m[aá]s))\b/;
const turn = /\b(?:d[eé]|da|doble[sn]?|dobla|gire[sn]?|gira|voltee[sn]?|voltea|tome[sn]?|toma) (?:vuelta )?a (?:la|su|tu) (izquierda|derecha)\b/;
const lateral = /\ba (?:la|su|tu) (izquierda|derecha)\b/;
const straight = /\b(?:(?:siga[sn]?|sigue|vaya[sn]?|ve|camine[sn]?|camina|todo) (?:todo )?(?:derecho|recto)|sin dar vuelta)\b/;
const direction = /\b(?:(?:cruce[sn]?|cruza) (?:la|el|por)|(?:siga[sn]?|sigue|camine[sn]?|camina|baje[sn]?|baja|suba[sn]?|sube|vaya[sn]?|ve|pase[sn]?|pasa) (?:por|hacia|hasta|al|a la)|(?:est[aá]|queda) (?:all[aáí]|afuera|fuera|enfrente|al lado)|junto (?:al|a la)|frente a[l]?|a la vuelta)(?=$|[^\p{L}])/u;
const uncertainty = /\b(?:no (?:lo )?s[eé]|no estoy segur[oa]|no (?:estoy|estamos) (?:muy )?segur[oa]s?|no (?:me )?queda claro|creo que|me parece que|quiz[aá]s?|tal vez|a lo mejor|d[eé]j[eé]me (?:ver|pensar|revisar)|(?:dijo|dijiste) que|(?:puede[sn]?|podr[ií]a[sn]?) repetir|c[oó]mo (?:dijo|dijiste|dice[sn]?))(?=$|[^\p{L}])/u;
const affirm = /^(?:sí(?=\s*[,;.!]|$)|sí (?:claro|señor[ae]?|tenemos|hay|puede[sn]?|puedo|es)\b|claro(?: que sí)?(?=\s*[,;.!]|$)|por supuesto\b|(?:no hay problema|no se preocupe[sn]?|no te preocupes|no tiene (?:pierde|p[eé]rdida)|es muy f[aá]cil|est[aá] bien|de acuerdo)\b)/;
const deny = /^no(?:\s*[,;.!]|$| (?:lo (?:tengo|tenemos)|tenemos|hay|puedo|puede[sn]?|es|aceptamos|queda[n]?|gracias)\b)/;
const greeting = /^(?:hola|buenas(?: tardes| noches)?|buen(?:os)? d[ií]as?|bienvenid[oa]s?|mucho gusto|qu[eé] gusto (?:ver[lt][eo]|verte))\b/;
const quantity = /(?<![\p{L}\p{N}$.,-])(?:un[oa]?|dos|tres|[1-3]) (?:m[aá]s )?(?:boletos?|billetes?|pasajes?|caf[eé]s?|vasos?|tazas?|capuchinos?|lattes?|conchas?|donas?|jugos?|refrescos?|botellas?|bolsas?|cajas?|copias?|personas?|pasajeros?|adultos?|niñ[oa]s?|asientos?|mesas?|habitaciones?|noches?|tacos?|platos?|cervezas?|bebidas?)(?=$|[^\p{L}\p{N}])/u;
const countWord: Record<string, 1 | 2 | 3> = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, 1: 1, 2: 2, 3: 3 };
const namedPoints: Record<string, readonly [AnchorKind, RegExp]> = {
  "sunny-cup": ["menu", /\b(?:men[uú]|pizarr[oó]n|pizarra)(?=$|[^\p{L}])/u],
  station: ["machine", /\b(?:m[aá]quina(?:s)?|quiosco|kiosco|expendedora)\b/],
  "visitor-center": ["map", /\bmapas?\b/],
};
const counters = new Set(["station", "sunny-cup", "gas-station"]);
const ticket = /\b(?:boletos?|billetes?|pasajes?|recibo|ticket|cambio|tarjeta|credencial|pasaporte|efectivo|dinero)\b/;

/** The cues read the already composed Spanish, including the selected variety and register. */
export function classifyTalk(say: string, room: string, opening: boolean, closing = false, replay = false): ClassifiedCue {
  if (replay) return { family: "repeat" };
  const text = say.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
  // A question's wording can offer or express uncertainty. Only statements can assert polarity or give a direction.
  const parts = text.match(/¿[^?]*\?|[^¿.!?]+[.!?]*/g) ?? [];
  const statements = parts.filter((part) => !part.endsWith("?")).join(" ").replace(/^[¡\s]+/, "");
  const gives = handoff.test(statements);
  const named = namedPoints[room];
  const anchor = gives && counters.has(room) && (room !== "station" || ticket.test(text) || /^aqu[ií] tiene[sn]?[.!]?$/.test(statements))
    ? "handoff" : named?.[1].test(text) ? named[0] : undefined;
  if (farewell.test(statements) || closing && closingThanks.test(statements)) return { family: "goodbye", anchor };
  // A greeting and its first service question are one opening, including “¿Quiere un café?”.
  const startsWithGreeting = greeting.test(text.replace(/^¡/, ""));
  if (gives || serve.test(text) || !startsWithGreeting && parts.some((part) => part.endsWith("?") && invitation.test(part))) {
    return { family: "offer", anchor };
  }
  const side = (turn.exec(statements) ?? lateral.exec(statements))?.[1];
  if (side) return { family: "point", side: side === "izquierda" ? -1 : 1,
    ...(straight.test(statements) ? { straight: true as const } : {}), anchor };
  if (straight.test(statements)) return { family: "point", straight: true, anchor };
  if (direction.test(statements)) return { family: "point", anchor };
  if (uncertainty.test(text)) return { family: "shrug", anchor };
  const polarity = statements.replace(/^(?:perd[oó]n|lo siento|mmm)[, ]+/, "");
  if (affirm.test(polarity)) return { family: "yes", anchor };
  if (deny.test(polarity)) return { family: "no", anchor };
  const amount = quantity.exec(statements)?.[0].split(" ", 1)[0];
  if (amount) return { family: "count", quantity: countWord[amount], anchor };
  if (opening && startsWithGreeting) return { family: "greeting", anchor };
  if (text.includes("?")) return { family: "question", anchor };
  return { family: "rest", anchor };
}
