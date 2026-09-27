// Registry of multiword English units (TOMAS-INTERLINEAR-v2 §3: every merge records its reason,
// the finer split considered and why nothing can be removed). The validator requires every
// multiword EN unit in the game's content to be covered by an explicit entry or by one of the
// convention rules below (CONVENTIONS.md codes). AI-authored; owner review pending.

export type MergeReason = "lexical_expression" | "grammatical_fusion" | "bound_morphology";
export interface MergeRecord { reason: MergeReason; split: string; minimal: string; code?: string }

const R = (reason: MergeReason, split: string, minimal: string, code?: string): MergeRecord => ({ reason, split, minimal, code });
const LEX = (split: string, minimal = "All words form the expression.") => R("lexical_expression", split, minimal, "C-LEX");

export const MERGES: Record<string, MergeRecord> = {
  // Fixed expressions (C-LEX)
  "i'm sorry": LEX("I'm → aš esu + sorry → gailiu gives a false “I am pitiful”; apology = atsiprašau."),
  "of course": LEX("of → — + course → kursas gives a false meaning; = žinoma."),
  "you're welcome": LEX("You're → jūs esate + welcome → laukiami means “welcome to come”, not the reply to thanks (= prašom)."),
  "take care": LEX("take → imkite + care → rūpestį is a false literal; = laikykitės."),
  "see you": LEX("see → matysiu + you → jus is a literal reading of a farewell (= iki)."),
  "take your time": LEX("take → imkite, your → savo, time → laiką is a calque; meaning “don't hurry” (= neskubėkite)."),
  "here you go": LEX("here → štai, you → jūs, go → einate is false; handing something over = prašom."),
  "very much": LEX("very → labai + much → daug gives “labai daug” (a lot), not the intensifier of thanks."),
  "so much": LEX("so → taip + much → daug gives “so much quantity”, not the intensifier of thanks (= labai)."),
  "hi there": LEX("there → ten would add a false place; “Hi there” is one greeting (= sveiki)."),
  "how's it going": LEX("How's → kaip yra, it → tai, going → einantis is a literal reading of a set greeting (= kaip sekasi)."),
  "get started": LEX("get → gauti + started → pradėtas is false; “get something started” = pradėti ruošti.", "“for you” stays outside."),
  "which one": R("grammatical_fusion", "one → vienas would add a false numeral; prop-word “one” is absorbed by the pronoun kurį.", "Two words.", "C-ONE"),
  "coming right up": LEX("coming → ateina, right → tiesiai, up → aukštyn is false; service formula = tuoj bus."),
  "i see": LEX("I → aš + see → matau; as a reply it means “I understand” = suprantu."),
  "got it": LEX("got → gavau + it → tai means “I received it”; here = supratau."),
  "have a seat": LEX("have → turėkite, a → —, seat → vietą is false; invitation = prisėskite."),
  "warmed up": R("lexical_expression", "up → aukštyn is prohibited as mechanical; warm up = pašildyti.", "Two words.", "C-PHR"),
  "we're out of": LEX("we're → mes esame, out → lauke, of → — is false; “be out of something” = baigėsi.", "The noun stays outside."),
  "be okay": R("grammatical_fusion", "be → būti + okay → gerai loses the conditional request; = tiktų (would suit).", "Two words.", "C-LEX"),
  "is down": LEX("is → yra + down → žemyn is false; a machine “is down” = neveikia."),
  "right now": LEX("right → dešinėje/teisingai + now → dabar is false; = šiuo metu."),
  "flat white": LEX("flat → plokščias + white → baltas names no drink; the coffee is called „flat white“."),
  "apple pay": LEX("A brand name; apple → obuolys + pay → mokėti would be nonsense."),
  "how much": LEX("how → kaip + much → daug is false; asking a price = kiek."),
  "as well": LEX("as → kaip + well → gerai is false; = taip pat."),
  "is fine": LEX("is → yra + fine → gerai gives “X yra gerai”; accepting an option = tinka / galima."),
  "i'd like": R("grammatical_fusion", "I'd → aš drops “would”; the conditional ending of norėčiau carries would + like.", "Object stays outside.", "C-FUT"),
  "let me get": LEX("let → leiskite, me → man, get → gauti asks permission; in ordering it means “I'll have” (= paimsiu)."),
  "i'll go with": R("lexical_expression", "I'll → aš + go → eisiu + with → su is false; “go with” = choose (rinksiuosi).", "Object stays outside.", "C-FUT"),
  "for here": LEX("for → už/skirta + here → čia is false; “for here” = to have it here (čia)."),
  "to go": LEX("to → į + go → eiti is false; takeaway “to go” = išsinešti."),
  "not bad": R("grammatical_fusion", "not → ne + bad → blogai: Lithuanian writes the negated adverb as one word, neblogai.", "Two words, both needed.", "C-NEG"),
  "more slowly": R("bound_morphology", "more → daugiau + slowly → lėtai: the comparative is the suffix of lėčiau.", "Both words needed.", "C-LEX"),
  "at the end": R("grammatical_fusion", "at → prie + the → — + end → galas: the locative gale carries “at”.", "No adjective intervenes.", "C-CASE"),
  "at all": LEX("at → prie + all → viskas is false; intensifier = visai."),
};

/** Convention rules (CONVENTIONS.md) that cover whole families of merges. */
const RULES: { re: RegExp; rec: MergeRecord }[] = [
  { re: /^(don't|doesn't|didn't|won't|can't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|wouldn't|shouldn't|couldn't) [a-z]+$/,
    rec: R("grammatical_fusion", "Splitting gives a stray ne- and a bare verb; Lithuanian negation is the prefix ne- on the verb, auxiliary do/will has no word.", "Subject and object stay outside.", "C-NEG") },
  { re: /^(i|you|he|she|it|we|they|that|there)'ll [a-z]+$/,
    rec: R("grammatical_fusion", "“'ll → aš/jis…” would equate the contraction with the bare pronoun and drop “will”; the Lithuanian future is the verb ending.", "Object stays outside.", "C-FUT") },
  { re: /^(it'll|that'll|there'll|will) be$/,
    rec: R("grammatical_fusion", "“will” has no separate word: the future copula bus carries it.", "Two words.", "C-FUT") },
  { re: /^(i'm|you're|we're|they're|it's|he's|she's|is|are|am) [a-z]+ing$/,
    rec: R("grammatical_fusion", "is/are → yra + participle gives a false stative reading; Lithuanian has one finite verb.", "Two words.", "C-PROG") },
  { re: /^to [a-z]+$/,
    rec: R("grammatical_fusion", "Infinitive “to” → į would be false; the Lithuanian infinitive ending -ti carries it.", "Two words.", "C-INF") },
  { re: /^(of|in|on|at|for|by|with|from|to) (the |a |an |my |your )?[a-z-]+$/,
    rec: R("grammatical_fusion", "The preposition (and article) have no separate Lithuanian word here: the case ending of the noun/pronoun carries them (in a museum → muziejuje).", "No independently glossable word (adjective, possessive, numeral) is inside.", "C-CASE") },
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
