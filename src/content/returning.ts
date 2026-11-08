// Small, fixed model replies for the returning openings that otherwise reuse first-visit examples.
// Existing remembered-item, prescription, date-of-birth, repair and rescheduling hints stay authoritative.
import { t } from "./dsl";
import type { HintGroup, SentSrc, Suggestion } from "./types";

function again(s: SentSrc, hello = false): SentSrc {
  return {
    en: `${hello ? "Hello" : "Hi"} | again! | ${s.en}`,
    lt: `{j:Sveiki|t:Labas} | vėl! | ${s.lt}`,
    nat: `{j:Sveiki|t:Labas} dar kartą! ${s.nat}`,
    say: s.say ? `${hello ? "Hello" : "Hi"} again! ${s.say}` : undefined,
  };
}
function group(lt: string, sentences: SentSrc[]): HintGroup {
  return { lt, items: sentences.map((s, i) => ({ id: `return_${i + 1}`, s })) };
}
export const RETURNING_HINTS: Record<string, HintGroup> = {
  return_car: group("Pasakyti, kad vėl domiesi automobiliu", [
    again(t("I'm | here | about | the | car.", "Aš | čia | dėl | — | automobilio.", "Aš dėl automobilio.")),
    again(t("Is | the | car | still | for sale?", "Ar | — | automobilis | vis dar | parduodamas?", "Ar automobilis dar parduodamas?"), true),
  ]),
  return_kitchen: group("Vėl paprašyti šefo paragauti", [
    again(t("Could | you | taste | this?", "Ar galėtumėte | jūs | paragauti | šito?", "Ar galėtumėte paragauti?")),
    again(t("I'd love | your | feedback.", "Labai norėčiau | jūsų | pastabų.", "Labai norėčiau išgirsti jūsų pastabas."), true),
  ]),
  return_review: group("Atsakyti, kaip jautiesi prieš šį pokalbį", [
    again(t("I'm | fine, | thanks.", "Man | gerai, | ačiū.", "Man gerai, ačiū.")),
    again(t("A bit | curious, | actually.", "Šiek tiek | smalsu, | tiesą sakant.", "Tiesą sakant, šiek tiek smalsu."), true),
  ]),
  return_heat: group("Paaiškinti, kad vėl neveikia šildymas", [
    again(t("My | heat | isn't working.", "Mano | šildymas | neveikia.", "Mano šildymas neveikia.")),
    again(t("My | radiators | are | ice cold.", "Mano | radiatoriai | yra | lediniai.", "Mano radiatoriai lediniai."), true),
  ]),
  return_doctor: group("Pasakyti gydytojai, kaip jautiesi dabar", [
    again(t("I | don't feel | well.", "Aš | nesijaučiu | gerai.", "Nesijaučiu gerai.")),
    again(t("I | have | a | cough.", "Aš | turiu | — | kosulį.", "Aš kosėju."), true),
  ]),
  return_supermarket: group("Atsakyti, ar šį kartą viską radai", [
    again(t("I | found | everything, | thanks.", "Aš | radau | viską, | ačiū.", "Viską radau, ačiū.")),
    again(t("I | couldn't find | the | rice.", "Aš | neradau | — | ryžių.", "Neradau ryžių."), true),
  ]),
  return_how: group("Pasisveikinti dar kartą ir pasakyti, kaip sekasi", [
    again(t("I'm | good, | thanks. | And | you?", "Man | gerai, | ačiū. | O | tau?", "Gerai, ačiū. O tau?")),
    again(t("Pretty | good, | thanks!", "Visai | gerai, | ačiū!", "Visai gerai, ačiū!"), true),
  ]),
  return_visitor: group("Padėkoti ir pasakyti, ko reikia šį kartą", [
    t("Thanks! | Could | I | have | a | map, | please?", "Ačiū! | Ar galėčiau | aš | gauti | — | žemėlapį, | prašau?", "Ačiū! Ar galėčiau gauti žemėlapį?"),
    t("Thank | you. | How | do | I | get | to | Sunny Cup?", "Dėkoju | jums. | Kaip | — | man | nueiti | į | „Sunny Cup“?", "Ačiū! Kaip nueiti į „Sunny Cup“?"),
  ]),
  return_cafe: group("Pasisveikinti dar kartą ir užsisakyti", [
    again(t("I'll have | a | latte, | please.", "Užsisakysiu | — | latę, | prašau.", "Norėčiau latės.")),
    again(t("I'd like | a | cappuccino, | please.", "Norėčiau | — | kapučino, | prašau.", "Norėčiau kapučino."), true),
  ]),
  return_usual: group("Pasirinkti įprastą užsakymą arba šį kartą ką kita", [
    t("Yes, | please.", "Taip, | prašau.", "Taip, kaip įprastai, prašau."),
    t("Actually, | this | time | I'll have | a | cappuccino.", "Tiesą sakant, | šį | kartą | užsisakysiu | — | kapučino.", "Tiesą sakant, šį kartą norėčiau kapučino."),
    t("No, | thanks.", "Ne, | ačiū.", "Šį kartą ne, ačiū."),
  ]),
  return_restaurant: group("Pasisveikinti dar kartą ir pasakyti dėl staliuko", [
    again(t("I | have | a | reservation.", "Aš | turiu | — | rezervaciją.", "Esu {m:rezervavęs|f:rezervavusi} staliuką.")),
    again(t("We | don't have | a | reservation.", "Mes | neturime | — | rezervacijos.", "Nesame rezervavę staliuko."), true),
  ]),
  return_shop: group("Pasakyti, ko ieškai šį kartą", [
    again(t("I'm looking | for | a | jacket.", "Aš ieškau | — | — | striukės.", "Ieškau striukės.")),
    again(t("I'm | just | looking, | thanks.", "Aš | tik | dairausi, | ačiū.", "Tik dairausi, ačiū."), true),
  ]),
  return_pharmacy: group("Pasakyti vaistininkui, ko reikia šį kartą", [
    again(t("I | have | a | headache.", "Man | skauda | — | galvą.", "Man skauda galvą.")),
    again(t("I'm | here | to pick up | a | prescription.", "Aš | čia | atsiimti | — | vaistų pagal receptą.", "Atėjau atsiimti vaistų pagal receptą."), true),
  ]),
  return_salon: group("Pasakyti, ar jau užsirašei į kirpyklą", [
    again(t("I | have | an | appointment | at | three.", "Aš | turiu | — | vizitą | — | trečią.", "Esu {m:užsirašęs|f:užsirašiusi} trečiai valandai.")),
    again(t("Do | you | take | walk-ins?", "Ar | jūs | priimate | neužsirašiusius?", "Ar priimate neužsirašiusius?"), true),
  ]),
  return_bank: group("Pasakyti, kokios banko paslaugos reikia dabar", [
    again(t("I'd like | to send | money | home.", "Norėčiau | išsiųsti | pinigų | namo.", "Norėčiau išsiųsti pinigų namo.")),
    again(t("I'd like | to open | a | checking | account.", "Norėčiau | atsidaryti | — | einamąją | sąskaitą.", "Norėčiau atsidaryti einamąją sąskaitą."), true),
  ]),
};

/** Exact current-turn guards: a later visit alone never replaces otherwise relevant help. */
export function returningSuggestion(sit: string, visits: number, lines: readonly string[], pending: string | undefined, step: string | undefined): Suggestion | null {
  if (visits < 1) return null;
  const has = (...ids: string[]) => ids.some(id => lines.includes(id));
  let hint: string | undefined;
  if (sit === "p25-used-car" && step === "arrive" && has("intro_again")) hint = "return_car";
  if (sit === "p28-kitchen" && step === "serve" && has("greet_back")) hint = "return_kitchen";
  if (sit === "p28b-review" && step === "feeling" && has("hello_back")) hint = "return_review";
  if (sit === "p29-landlord" && pending === "guess" && has("greet_again")) hint = "return_heat";
  if (sit === "s31-doctor" && step === "problem" && has("greet_back", "greet_back_feeling")) hint = "return_doctor";
  if (sit === "s32-supermarket" && step === "find" && has("greet_back")) hint = "return_supermarket";
  if (sit === "s33-small-talk" && pending === "howareyou" && has("hello_known_how")) hint = "return_how";
  if (sit === "s62-visitor-center" && step === "need" && has("greet_back")) hint = "return_visitor";
  if (sit === "s72-cafe" && pending === "usual" && has("usual")) hint = "return_usual";
  else if (sit === "s72-cafe" && step === "order" && has("greet_back")) hint = "return_cafe";
  if (sit === "s73-restaurant" && step === "resv" && has("greet_back")) hint = "return_restaurant";
  if (sit === "s74-clothes" && !pending && step === "item" && has("greet_back")) hint = "return_shop";
  if (sit === "s75-pharmacy" && !pending && step === "need" && has("greet_back")) hint = "return_pharmacy";
  if (sit === "s77-salon" && step === "appt" && has("greet_back")) hint = "return_salon";
  if (sit === "s78-bank" && step === "help" && has("greet_back")) hint = "return_bank";
  if (sit === "s82-neighbor" && pending === "howareyou" && has("greet_known")) hint = "return_how";
  return hint ? { lt: RETURNING_HINTS[hint].lt, hint } : null;
}
