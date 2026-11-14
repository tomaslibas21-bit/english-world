// Registry of multiword Spanish units (replaces src/content/merges.ts in the Spanish edition). The interlinear rule is
// the same as the English edition's: one Spanish word per unit, glossed in English, unless splitting would give a
// false meaning or a missing correspondence. Every multiword unit is covered here, by a rule below, or by the
// situation's own `merges` field; tools/check-content.ts lists the ones that aren't. Conventions: docs/es/STYLE.md.

export type MergeReason = "lexical_expression" | "grammatical_fusion" | "bound_morphology";
export interface MergeRecord { reason: MergeReason; split: string; minimal: string; code?: string }

const R = (reason: MergeReason, split: string, minimal: string, code?: string): MergeRecord => ({ reason, split, minimal, code });
const LEX = (split: string, minimal = "All words form the expression.") => R("lexical_expression", split, minimal, "S-LEX");

export const MERGES: Record<string, MergeRecord> = {
  // greetings, thanks, courtesy (S-LEX)
  "por favor": LEX("por → for + favor → favor is a false literal; = please."),
  "de nada": LEX("de → of + nada → nothing is a literal reading of the reply to thanks; = you're welcome."),
  "lo siento": LEX("lo → it + siento → I feel; the set apology = I'm sorry."),
  "buenos días": LEX("buenos → good (plural) + días → days; one greeting = good morning."),
  "buen día": LEX("buen → good + día → day; one greeting = good morning."),
  "buenas tardes": LEX("buenas → good + tardes → afternoons; one greeting = good afternoon."),
  "buenas noches": LEX("buenas → good + noches → nights; one greeting = good evening / good night."),
  "qué tal": LEX("qué → what + tal → such; one question = how are you / how's it going."),
  "mucho gusto": LEX("mucho → much + gusto → pleasure; on meeting = nice to meet you."),
  "con gusto": LEX("con → with + gusto → pleasure; agreeing to help = gladly / my pleasure."),
  "a la orden": LEX("a → to + la → the + orden → order; Mexican = at your service / you're welcome."),
  "con permiso": LEX("con → with + permiso → permission; passing or leaving = excuse me."),
  "cómo no": LEX("cómo → how + no → not; = of course (a yes, not a negation)."),
  "por supuesto": LEX("por → for + supuesto → supposed; = of course."),
  "claro que sí": LEX("claro → clear + que → that + sí → yes; = of course."),
  "de acuerdo": LEX("de → of + acuerdo → agreement; = okay, agreed."),
  "sin problema": LEX("sin → without + problema → problem; = no problem."),
  "no hay problema": LEX("no → not + hay → there is + problema → problem reads as a statement; = no problem."),
  "ni modo": LEX("ni → nor + modo → way; Mexican shrug = oh well."),
  "qué onda": LEX("qué → what + onda → wave; Mexican greeting = what's up."),
  "a ver": LEX("a → to + ver → see; = let's see."),
  "ya está": LEX("ya → already + está → is; = that's it / done."),
  "otra vez": LEX("otra → other + vez → time; = again."),
  "de nuevo": LEX("de → of + nuevo → new; = again."),
  "tal vez": LEX("tal → such + vez → time; = maybe."),
  "a veces": LEX("a → to + veces → times; = sometimes."),
  "nada más": LEX("nada → nothing + más → more; = just / that's all (not a negation of the order)."),
  "de hecho": LEX("de → of + hecho → fact/done; = actually."),
  "sin embargo": LEX("sin → without + embargo → seizure; = however."),
  "lo que": LEX("lo → it + que → that; = what (the thing that)."),
  "por qué": LEX("por → for + qué → what; = why."),
  "o sea": LEX("o → or + sea → be; filler = I mean."),
  "más despacio": R("bound_morphology", "más → more + despacio → slowly: English says it in one comparative, more slowly.", "Both words needed.", "S-LEX"),
  "aquí tiene": LEX("aquí → here + tiene → you have; handing something over = here you go."),
  "aquí tienes": LEX("aquí → here + tienes → you have (tú); handing something over = here you go."),
  "está bien": LEX("está → is + bien → well; agreeing = okay / that's fine."),
  "ya veo": LEX("ya → already + veo → I see; = I see."),
  "me equivoqué": LEX("me → myself + equivoqué → I mistook; = my mistake."),
  "no hay de qué": LEX("no → not + hay → there is + de → of + qué → what; the reply to thanks = don't mention it."),
  "nos vemos": LEX("nos → each other + vemos → we see; farewell = see you."),
  "hasta luego": LEX("hasta → until + luego → later; farewell = see you later."),
  "hasta pronto": LEX("hasta → until + pronto → soon; farewell = see you soon."),
  "tómese su tiempo": LEX("tómese → take (usted) + su → your + tiempo → time; = take your time."),
  "tómate tu tiempo": LEX("tómate → take (tú) + tu → your + tiempo → time; = take your time."),
  "sin prisa": LEX("sin → without + prisa → hurry; = no rush."),
  "no pasa nada": LEX("no → not + pasa → happens + nada → nothing; = no worries."),
  "deja que": LEX("deja → let + que → that; with a subjunctive = let me (Spain: deja que te lo enseñe)."),
  "deje que": LEX("deje → let (usted) + que → that; with a subjunctive = let me (Spain: deje que se lo enseñe)."),
  "me alegro": LEX("me → myself + alegro → I gladden; = I'm glad."),
  "qué bien": LEX("qué → what + bien → well is a word-for-word exclamation; = how nice, great."),
  "menos mal": LEX("menos → less + mal → bad; Spain's set phrase = good thing, thank goodness."),
  "ahora mismo": LEX("ahora → now + mismo → same is false; = right now, right away."),
  "aquí está": LEX("aquí → here + está → is; = here it is."),
  "ahí está": LEX("ahí → there + está → is; = there it is."),
  "lo de siempre": LEX("lo → it + de → of + siempre → always; = the usual."),
  "buen provecho": LEX("buen → good + provecho → benefit; at a meal = enjoy (your meal)."),
  "al fondo": LEX("al → to the + fondo → bottom; = at the back."),
  "se nos acabó": LEX("se → itself + nos → (to) us + acabó → it ended; = we ran out of."),
  "sería todo": LEX("sería → it would be + todo → all; Mexican, closing an order = that would be all."),
  "pan dulce": LEX("pan → bread + dulce → sweet; Mexican sweet bread = pastries."),
  "apple pay": LEX("A brand name.", "Two words of one name."),
  "google pay": LEX("A brand name.", "Two words of one name."),
  "cada uno": LEX("cada → each + uno → one; = each (per piece)."),
  "cada una": LEX("cada → each + una → one; = each (per piece)."),
  "me llevo": LEX("me → (for) myself + llevo → I carry; buying = I'll take."),
  "a cómo": LEX("a → at + cómo → how; market Spanish = how much (per kilo, per piece)."),
  "estados unidos": LEX("estados → states + unidos → united; one name = the United States.", "Two words of one name."),
  "nueva zelanda": LEX("nueva → new + zelanda → Zealand; one name = New Zealand.", "Two words of one name."),
  // shopping and services
  "para llevar": LEX("para → for + llevar → to carry; together = to go (takeout)."),
  "para aquí": LEX("para → for + aquí → here; = for here."),
  "en efectivo": LEX("en → in + efectivo → effective; paying = in cash."),
  "a nombre de": LEX("a → to + nombre → name + de → of; = under the name of / for."),
  "documento de identidad": LEX("documento → document + de → of + identidad → identity: one noun, an ID.", "Three words of one noun."),
  // telling the time
  "en punto": LEX("en → in + punto → point; = o'clock (sharp)."),
  "y media": LEX("y → and + media → half; = thirty (half past)."),
  "y cuarto": LEX("y → and + cuarto → quarter/room; = a quarter past."),
  "menos cuarto": LEX("menos → less + cuarto → quarter; = a quarter to."),
  "cuarto para": LEX("cuarto → quarter + para → for; Mexican = a quarter to."),
  "de la mañana": LEX("de → of + la → the + mañana → morning; after a time = a.m."),
  "de la tarde": LEX("de → of + la → the + tarde → afternoon; after a time = p.m."),
  "de la noche": LEX("de → of + la → the + noche → night; after a time = p.m. (at night)."),
  "por la mañana": LEX("por → by + la → the + mañana → morning; Spain's time phrase = in the morning (en la mañana)."),
  "por la tarde": LEX("por → by + la → the + tarde → afternoon; Spain's time phrase = in the afternoon (en la tarde)."),
  "por la noche": LEX("por → by + la → the + noche → night; Spain's time phrase = at night (en la noche)."),
  // directions
  "a la derecha": LEX("a → to + la → the + derecha → right; = on the right / to the right."),
  "a la izquierda": LEX("a → to + la → the + izquierda → left; = on the left / to the left."),
  "todo derecho": LEX("todo → all + derecho → straight/right; = straight ahead."),
  "a la vuelta": LEX("a → to + la → the + vuelta → turn; = around the corner."),
};

/** Convention rules (docs/es/STYLE.md) that cover whole families of merges. */
const RULES: { re: RegExp; rec: MergeRecord }[] = [
  // "no tengo" → "I don't have", "no sé" → "I don't know", "no me gusta" → "I don't like"
  { re: /^no ((me|te|se|le|lo|la|nos|les|los|las) )?[a-záéíóúñü]+$/,
    rec: R("grammatical_fusion", "no → not + verb would read “not I-have”; English puts don't/doesn't/didn't inside the verb phrase.", "Subject and object stay outside.", "S-NEG") },
  // "me gusta" → "I like", "me llamo" → "my name is", "se llama" → "is called", "me duele" → "hurts (me)"
  { re: /^(me|te|se|le|nos|les) (gusta|gustan|gustaría|encanta|encantan|llamo|llamas|llama|llaman|queda|quedan|duele|duelen|falta|faltan|toca|parece|interesa)$/,
    rec: R("grammatical_fusion", "me → to me + gusta → pleases is a word-for-word reading of one English verb (I like / my name is / it hurts).", "Two words.", "S-CLITIC") },
  // "se puede" → "can I / is it possible", "se habla" → "is spoken"
  { re: /^se [a-záéíóúñü]+$/,
    rec: R("grammatical_fusion", "Impersonal or passive se has no English word of its own; the English verb phrase carries it (se puede → can I / is it possible).", "Two words.", "S-CLITIC") },
  // "dámelo", "tráigamela" are one word already; "me lo" / "se lo" before a verb: the two pronouns
  // Spain's perfect (docs/es/STYLE.md "Spain Spanish"): "he dicho" → "I said", "no te he entendido", "se ha ido"
  { re: /^(no )?((me|te|se|le|lo|la|nos|os|les|los|las) ){0,2}(he|has|ha|hemos|habéis|han) [a-záéíóúñü]+(ado|ido|ído|to|cho|sto|elto|ierto|uesto)$/,
    rec: R("grammatical_fusion", "haber + participle is one English verb (the perfect: I have said / I said); glossed together, as English often uses the simple past.", "Two to four words.", "S-PERFECT") },
  // Spain's vosotros: "os" before a verb ("os traigo", "os lo traigo") and "os lo / os la…"
  { re: /^(no )?os ((lo|la|los|las) )?[a-záéíóúñü]+$/,
    rec: R("grammatical_fusion", "os → to/for you (all) before the verb, as me/te/nos are.", "Two or three words.", "S-CLITIC") },
  { re: /^(me|te|se|nos|os) (lo|la|los|las)$/,
    rec: R("grammatical_fusion", "Two object pronouns before the verb are glossed together (me lo → it to me).", "Two words.", "S-CLITIC") },
];

export function mergeKey(unit: string): string {
  return unit.toLowerCase().replace(/[’‘]/g, "'").replace(/^[\s"“”'‘’(¿¡]+|[\s"“”'‘’.,!?;:)…]+$/g, "").replace(/\s+/g, " ");
}

export function mergeRecord(unit: string): MergeRecord | undefined {
  const k = mergeKey(unit);
  if (MERGES[k]) return MERGES[k];
  for (const r of RULES) if (r.re.test(k)) return r.rec;
  return undefined;
}
