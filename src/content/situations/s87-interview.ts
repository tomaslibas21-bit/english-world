// Song 87 "Why Should We Hire You?": a job interview at the Brightline office.
// Ms. Brooks, the HR manager (formal: jūs), interviews the learner: arrival ("I have an interview at
// 9:30"), name, a little small talk ("Did you find us okay?" / water or coffee), "Tell me about yourself"
// (job, field and years of experience are filled from whatever the learner says; Ms. Brooks asks only
// for what is still missing), why here, strengths, then a different selection of the classic questions on
// each visit (weaknesses, why a new job, teamwork, five years, languages, work authorization, salary,
// start date, "Why should we hire you?"), the learner's own questions (hours, training, start date, team,
// working from home, benefits, a typical day, next steps …) and the goodbye ("We'll be in touch").
// Ms. Brooks reacts briefly and never judges whether an answer is true.
// Twists (returning visits): a phone call interrupts the interview; the job is offered on the spot.
//
// Gender: job titles and strengths describe the learner, so their entities carry feminine forms (ltF):
// "Esu slaugytoja", "Esu organizuota" for a female player, in hints, chips and Ms. Brooks's lines.
//
// NEEDS: Game.ts GIVEN could add "coffee": ["☕", "kavos"] for the coffee Ms. Brooks offers (the "give"
// toast is generic now).

import type { Ctx, EntityDef, SituationDef, Suggestion } from "../types";
import type { SlotFn, SlotResult } from "../../convo/grammar";
import { ent, t } from "../dsl";
import { readInt } from "../../convo/slots";
import { agree, CASES } from "../../convo/lt-morph";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_DO_Q = "Question “Do” = the particle ar.";
const F_DOES_Q = "Question “Does” = the particle ar.";
const F_ARE_Q = "“Are” in a yes/no question = the particle ar; Lithuanian needs no copula here.";
const F_WH_DO = "Question “do” has no Lithuanian word; the tense sits on the verb.";
const F_WH_DID = "Question “did” has no Lithuanian word; the past tense sits on the verb.";
const F_PROG = "Progressive “are” has no Lithuanian word; the present tense of the verb carries it.";
const F_WOULD = "“would” has no separate word: the conditional ending of the verb carries it.";
const F_ID = "“'d” (would) is carried by the conditional ending of the verb.";
const F_VE = "Perfect “'ve” has no separate word: Lithuanian uses the present tense for a state that still continues.";
const F_HAVE = "Perfect “have” has no Lithuanian word: the present tense covers a state that still continues.";
const F_AS = "“as”: the instrumental case carries it.";
const F_IN = "“in”: the locative ending of the noun phrase carries it.";
const F_DUR = "Duration “for”: the case of the time phrase carries it.";
const F_OF_YEARS = "“of”: the genitive metų carries the relation.";
const F_A_PER = "Distributive “a” (a year, a week) = per.";
const F_AT_CLOCK = "Clock “at”: Lithuanian uses the time alone.";
const F_KNOW = "“know” is part of “let … know”; pranešti (under “let”) carries it.";
const F_THATS = "“'s” (is): Lithuanian needs no copula here.";

// ---------------------------------------------------------------------------
// Lithuanian forms

/** Six case forms of a noun given in the nominative (regular stems used below). */
function declNoun(nom: string): string[] {
  const x = (n: number) => nom.slice(0, -n);
  if (nom.endsWith("ius")) return [nom, x(3) + "iaus", x(3) + "iui", x(3) + "ių", x(3) + "iumi", x(3) + "iuje"];
  if (nom.endsWith("ys")) return [nom, x(2) + "io", x(2) + "iui", x(2) + "į", x(2) + "iu", x(2) + "yje"];
  if (nom.endsWith("is")) return [nom, x(2) + "io", x(2) + "iui", x(2) + "į", x(2) + "iu", x(2) + "yje"];
  if (nom.endsWith("jas")) return [nom, x(2) + "o", x(2) + "ui", x(2) + "ą", x(2) + "u", x(2) + "uje"];
  if (nom.endsWith("as")) return [nom, x(2) + "o", x(2) + "ui", x(2) + "ą", x(2) + "u", x(2) + "e"];
  if (nom.endsWith("ė")) return [nom, x(1) + "ės", x(1) + "ei", x(1) + "ę", x(1) + "e", x(1) + "ėje"];
  if (nom.endsWith("a")) return [nom, x(1) + "os", x(1) + "ai", x(1) + "ą", x(1) + "a", x(1) + "oje"];
  return Array(6).fill(nom);
}

/** One unit's forms: "=x" fixed; "~adj" an adjective agreeing with g; "a/b/c/d/e/f" written out;
 *  otherwise a noun phrase whose last word declines ("atrankos specialistas"). */
function unitForms(spec: string, g: "m" | "f"): string {
  if (spec.startsWith("=")) return spec.slice(1);
  if (spec.startsWith("~")) return CASES.map((c) => agree(spec.slice(1), g, c)).join("/");
  if (spec.includes("/")) return spec;
  const words = spec.split(" ");
  const last = words.pop()!;
  const pre = words.length ? words.join(" ") + " " : "";
  return declNoun(last).map((f) => pre + f).join("/");
}
const ltOf = (spec: string, g: "m" | "f") => spec.split(" | ").map((u) => unitForms(u, g)).join(" | ");

// ---------------------------------------------------------------------------
// Jobs: [id, English units, masculine units, feminine units, synonyms]

type JobRow = [string, string, string, string, string[]];
const JOB_ROWS: JobRow[] = [
  ["accountant", "accountant", "buhalteris", "buhalterė", ["bookkeeper", "accountants", "chief accountant", "cpa"]],
  ["nurse", "nurse", "slaugytojas", "slaugytoja", ["registered nurse", "nurses", "nursing assistant", "nurse assistant"]],
  ["teacher", "teacher", "mokytojas", "mokytoja", ["school teacher", "english teacher", "math teacher", "high school teacher", "elementary school teacher", "primary school teacher", "teachers"]],
  ["engineer", "engineer", "inžinierius", "inžinierė", ["mechanical engineer", "civil engineer", "electrical engineer", "engineers"]],
  ["programmer", "programmer", "programuotojas", "programuotoja", ["software developer", "developer", "software engineer", "web developer", "coder", "front end developer", "back end developer", "programmers"]],
  ["manager", "manager", "vadovas", "vadovė", ["team leader", "team lead", "supervisor", "department manager", "head of department", "managers"]],
  ["salesperson", "salesperson", "pardavėjas", "pardavėja", ["sales assistant", "shop assistant", "salesman", "saleswoman", "sales clerk", "sales rep", "sales representative", "store clerk", "retail assistant"]],
  ["driver", "driver", "vairuotojas", "vairuotoja", ["bus driver", "taxi driver", "delivery driver", "uber driver", "courier", "van driver"]],
  ["project_manager", "project | manager", "=projektų | vadovas", "=projektų | vadovė", ["product manager", "project coordinator"]],
  ["office_manager", "office | manager", "=biuro | administratorius", "=biuro | administratorė", ["office administrator", "office admin", "administrative assistant", "admin assistant", "administrator"]],
  ["sales_manager", "sales | manager", "=pardavimų | vadybininkas", "=pardavimų | vadybininkė", ["account manager", "sales executive", "business development manager"]],
  ["customer_service_rep", "customer | service | representative", "=klientų | =aptarnavimo | specialistas", "=klientų | =aptarnavimo | specialistė",
    ["customer service rep", "customer service agent", "customer support agent", "customer support specialist", "call center agent", "call center operator"]],
  ["it_specialist", "IT | specialist", "=IT | specialistas", "=IT | specialistė", ["i t specialist", "it support", "it technician", "system administrator", "network administrator"]],
  ["marketing_specialist", "marketing | specialist", "=rinkodaros | specialistas", "=rinkodaros | specialistė", ["marketing manager", "marketer", "marketing assistant", "digital marketer", "social media manager"]],
  ["recruiter", "recruiter", "atrankos specialistas", "atrankos specialistė", ["hr specialist", "h r specialist", "hr manager", "human resources specialist", "hr assistant"]],
  ["analyst", "analyst", "analitikas", "analitikė", ["data analyst", "financial analyst", "business analyst"]],
  ["economist", "economist", "ekonomistas", "ekonomistė", []],
  ["designer", "designer", "dizaineris", "dizainerė", ["graphic designer", "web designer", "interior designer", "ux designer"]],
  ["architect", "architect", "architektas", "architektė", []],
  ["lawyer", "lawyer", "teisininkas", "teisininkė", ["attorney", "legal advisor", "paralegal", "solicitor"]],
  ["translator", "translator", "vertėjas", "vertėja", ["interpreter"]],
  ["journalist", "journalist", "žurnalistas", "žurnalistė", ["reporter", "editor"]],
  ["photographer", "photographer", "fotografas", "fotografė", []],
  ["doctor", "doctor", "gydytojas", "gydytoja", ["physician", "family doctor", "surgeon", "medical doctor"]],
  ["pharmacist", "pharmacist", "vaistininkas", "vaistininkė", []],
  ["dentist", "dentist", "odontologas", "odontologė", []],
  ["psychologist", "psychologist", "psichologas", "psichologė", ["therapist", "counselor"]],
  ["social_worker", "social | worker", "~socialinis | darbuotojas", "~socialinis | darbuotoja", []],
  ["kindergarten_teacher", "kindergarten | teacher", "=darželio | auklėtojas", "=darželio | auklėtoja", ["preschool teacher", "daycare teacher"]],
  ["lecturer", "lecturer", "dėstytojas", "dėstytoja", ["professor", "university lecturer", "university teacher"]],
  ["scientist", "scientist", "mokslininkas", "mokslininkė", ["researcher", "chemist", "biologist", "lab technician"]],
  ["chef", "chef", "virėjas", "virėja", ["cook", "line cook", "sous chef", "kitchen assistant"]],
  ["waiter", "waiter", "padavėjas", "padavėja", ["waitress", "server"]],
  ["bartender", "bartender", "barmenas", "barmenė", ["barman", "barmaid"]],
  ["barista", "barista", "barista", "barista", []],
  ["baker", "baker", "kepėjas", "kepėja", ["pastry chef", "confectioner"]],
  ["cashier", "cashier", "kasininkas", "kasininkė", []],
  ["store_manager", "store | manager", "=parduotuvės | vadovas", "=parduotuvės | vadovė", ["shop manager"]],
  ["truck_driver", "truck | driver", "=sunkvežimio | vairuotojas", "=sunkvežimio | vairuotoja", ["trucker", "lorry driver", "long haul driver", "driver of truck", "driver of a truck", "driver of trucks", "truck drivers"]],
  ["mechanic", "mechanic", "mechanikas", "mechanikė", ["car mechanic", "auto mechanic"]],
  ["electrician", "electrician", "elektrikas", "elektrikė", []],
  ["plumber", "plumber", "santechnikas", "santechnikė", []],
  ["construction_worker", "construction | worker", "=statybų | darbininkas", "=statybų | darbininkė", ["builder", "bricklayer"]],
  ["carpenter", "carpenter", "dailidė", "dailidė", ["joiner", "woodworker"]],
  ["factory_worker", "factory | worker", "=gamyklos | darbininkas", "=gamyklos | darbininkė", ["production worker", "machine operator", "assembly line worker"]],
  ["warehouse_worker", "warehouse | worker", "=sandėlio | darbuotojas", "=sandėlio | darbuotoja", ["warehouse operative", "forklift driver", "picker", "packer"]],
  ["logistics_coordinator", "logistics | coordinator", "=logistikos | koordinatorius", "=logistikos | koordinatorė", ["logistics manager", "logistics specialist", "dispatcher", "transport manager"]],
  ["security_guard", "security | guard", "=apsaugos | darbuotojas", "=apsaugos | darbuotoja", ["security officer"]],
  ["cleaner", "cleaner", "valytojas", "valytoja", ["janitor", "housekeeper", "cleaning lady"]],
  ["hairdresser", "hairdresser", "kirpėjas", "kirpėja", ["hairstylist", "hair stylist", "barber", "beautician"]],
  ["receptionist", "receptionist", "administratorius", "administratorė", ["front desk agent", "secretary"]],
  ["bank_clerk", "bank | clerk", "=banko | darbuotojas", "=banko | darbuotoja", ["bank teller", "teller", "banker", "bank employee"]],
  ["farmer", "farmer", "ūkininkas", "ūkininkė", []],
  ["police_officer", "police | officer", "=policijos | pareigūnas", "=policijos | pareigūnė", ["policeman", "policewoman", "cop"]],
  ["tailor", "tailor", "siuvėjas", "siuvėja", ["seamstress", "dressmaker"]],
  ["real_estate_agent", "real | estate | agent", "=nekilnojamojo | =turto | agentas", "=nekilnojamojo | =turto | agentė", ["realtor", "estate agent", "real estate broker"]],
  ["tour_guide", "tour | guide", "=ekskursijų | gidas", "=ekskursijų | gidė", ["tourist guide"]],
  ["flight_attendant", "flight | attendant", "=skrydžių | palydovas", "=skrydžių | palydovė", ["stewardess", "steward", "cabin crew"]],
  ["civil_servant", "civil | servant", "=valstybės | tarnautojas", "=valstybės | tarnautoja", ["government employee", "government worker", "public servant"]],
  ["librarian", "librarian", "bibliotekininkas", "bibliotekininkė", []],
  ["student", "student", "studentas", "studentė", ["university student", "college student", "graduate student"]],
];

/** The learner's job: masculine forms, plus feminine forms (ltF) the composer uses for a female player. */
const JOBS: EntityDef[] = JOB_ROWS.map(([id, en, m, f, syn]) => ent(id, en, ltOf(m, "m"), "m", { forms: syn, ltF: ltOf(f, "f") }));

// ---------------------------------------------------------------------------
// Fields ("I work in sales"): gender-neutral, so one list serves chips, hints and Ms. Brooks.

const SRITIS = (x: string) => ["sritis", "srities", "sričiai", "sritį", "sritimi", "srityje"].map((f) => `${x} ${f}`).join("/");
type FieldRow = [string, string, string, "m" | "f", string[]];
const FIELD_ROWS: FieldRow[] = [
  ["sales", "sales", SRITIS("pardavimų"), "f", ["selling"]],
  ["marketing", "marketing", "rinkodara", "f", ["advertising", "digital marketing"]],
  ["it", "IT", SRITIS("IT"), "f", ["i t", "information technology", "tech", "technology", "software", "an it company", "it companies", "computers"]],
  ["finance", "finance", SRITIS("finansų"), "f", ["financial services", "numbers", "money"]],
  ["economics", "economics", "ekonomika", "f", ["economy"]],
  ["business", "business", "verslas", "m", ["business administration", "management"]],
  ["accounting", "accounting", "buhalterinė apskaita/buhalterinės apskaitos/buhalterinei apskaitai/buhalterinę apskaitą/buhalterine apskaita/buhalterinėje apskaitoje", "f", ["bookkeeping"]],
  ["banking", "banking", "bankininkystė", "f", ["a bank", "banks", "bank"]],
  ["customer_service", "customer | service", "=klientų | aptarnavimas", "m", ["customer support", "client service", "a call center", "call centers", "a call centre", "call center", "customers", "clients"]],
  ["healthcare", "healthcare", "sveikatos priežiūra", "f", ["health care", "medicine", "the medical field", "nursing", "a hospital", "the hospital", "hospital", "clinic", "hospitals", "a clinic", "clinics", "a nursing home", "patients", "sick people", "old people", "elderly people"]],
  ["education", "education", "švietimas", "m", ["teaching", "schools", "a school", "a kindergarten", "school", "kindergarten", "university", "college", "kindergartens", "a university", "the university", "universities", "a college", "children", "kids", "students", "young people"]],
  ["construction", "construction", "statybos/statybų/statyboms/statybas/statybomis/statybose", "f", ["building", "a construction company", "construction sites"]],
  ["logistics", "logistics", "logistika", "f", ["shipping", "supply chain", "a warehouse", "warehouses", "a logistics company", "warehouse"]],
  ["transportation", "transportation", SRITIS("transporto"), "f", ["transport", "a transport company", "a trucking company", "trucking"]],
  ["manufacturing", "manufacturing", "gamyba", "f", ["production", "a factory", "factories", "factory"]],
  ["retail", "retail", "mažmeninė prekyba/mažmeninės prekybos/mažmeninei prekybai/mažmeninę prekybą/mažmenine prekyba/mažmeninėje prekyboje", "f", ["stores", "a store", "shops", "a shop", "a supermarket", "supermarkets", "supermarket", "store", "shop"]],
  ["hospitality", "hospitality", SRITIS("restoranų ir viešbučių"), "f", ["restaurants", "hotels", "the restaurant business", "the hotel business", "catering", "a hotel", "a restaurant", "a cafe", "hotel", "restaurant", "cafe"]],
  ["tourism", "tourism", "turizmas", "m", ["travel"]],
  ["hr", "HR", SRITIS("personalo"), "f", ["h r", "human resources", "recruiting", "recruitment"]],
  ["law", "law", SRITIS("teisės"), "f", ["the law", "legal", "a law firm"]],
  ["engineering", "engineering", "inžinerija", "f", []],
  ["design", "design", SRITIS("dizaino"), "f", ["graphic design", "web design"]],
  ["media", "media", "žiniasklaida", "f", ["journalism", "the media", "television"]],
  ["agriculture", "agriculture", "žemės ūkis/žemės ūkio/žemės ūkiui/žemės ūkį/žemės ūkiu/žemės ūkyje", "m", ["farming"]],
  ["government", "government", "valstybės tarnyba", "f", ["the government", "public service", "the public sector", "public sector"]],
  ["insurance", "insurance", SRITIS("draudimo"), "f", []],
  ["energy", "energy", "energetika", "f", []],
  ["administration", "administration", SRITIS("administravimo"), "f", ["office work", "office administration"]],
];
const FIELDS: EntityDef[] = FIELD_ROWS.map(([id, en, lt, g, forms]) =>
  ent(id, en, ltOf(lt, g), g, { forms, attrs: { multi: en.includes(" | ") } }));
const fieldMulti = (id: string) => !!FIELDS.find((e) => e.id === id)?.attrs?.multi;

// ---------------------------------------------------------------------------
// Strengths: [id, English units, kind, masculine units, feminine units]. "~" adjectives agree;
// t/d stems (darbštus, lankstus, kruopštus) are written out because of the č/dž alternation.

const DARBSTUS = { m: "darbštus/darbštaus/darbščiam/darbštų/darbščiu/darbščiame", f: "darbšti/darbščios/darbščiai/darbščią/darbščia/darbščioje" };
const LANKSTUS = { m: "lankstus/lankstaus/lanksčiam/lankstų/lanksčiu/lanksčiame", f: "lanksti/lanksčios/lanksčiai/lanksčią/lanksčia/lanksčioje" };
const KRUOPSTUS = { m: "kruopštus/kruopštaus/kruopščiam/kruopštų/kruopščiu/kruopščiame", f: "kruopšti/kruopščios/kruopščiai/kruopščią/kruopščia/kruopščioje" };
type StrengthRow = [string, string, "adj" | "noun", string, string];
const STRENGTH_ROWS: StrengthRow[] = [
  ["organized", "organized", "adj", "~organizuotas", "~organizuotas"],
  ["hardworking", "hardworking", "adj", DARBSTUS.m, DARBSTUS.f],
  ["reliable", "reliable", "adj", "~patikimas", "~patikimas"],
  ["responsible", "responsible", "adj", "~atsakingas", "~atsakingas"],
  ["patient", "patient", "adj", "~kantrus", "~kantrus"],
  ["flexible", "flexible", "adj", LANKSTUS.m, LANKSTUS.f],
  ["creative", "creative", "adj", "~kūrybingas", "~kūrybingas"],
  ["friendly", "friendly", "adj", "~draugiškas", "~draugiškas"],
  ["punctual", "punctual", "adj", "~punktualus", "~punktualus"],
  ["motivated", "motivated", "adj", "~motyvuotas", "~motyvuotas"],
  ["positive", "positive", "adj", "~pozityvus", "~pozityvus"],
  ["calm", "calm", "adj", "~ramus", "~ramus"],
  ["honest", "honest", "adj", "~sąžiningas", "~sąžiningas"],
  ["detail_oriented", "detail-oriented", "adj", KRUOPSTUS.m, KRUOPSTUS.f],
  ["energetic", "energetic", "adj", "~energingas", "~energingas"],
  ["independent", "independent", "adj", "~savarankiškas", "~savarankiškas"],
  ["curious", "curious", "adj", "~smalsus", "~smalsus"],
  ["ambitious", "ambitious", "adj", "~ambicingas", "~ambicingas"],
  ["proactive", "proactive", "adj", "~iniciatyvus", "~iniciatyvus"],
  ["loyal", "loyal", "adj", "~lojalus", "~lojalus"],
  ["efficient", "efficient", "adj", "~efektyvus", "~efektyvus"],
  ["helpful", "helpful", "adj", "~paslaugus", "~paslaugus"],
  ["team_player", "team | player", "noun", "=komandos | žaidėjas", "=komandos | žaidėja"],
  ["good_listener", "good | listener", "noun", "~geras | klausytojas", "~geras | klausytoja"],
  ["problem_solver", "problem | solver", "noun", "=problemų | sprendėjas", "=problemų | sprendėja"],
  ["hard_worker", "hard | worker", "noun", `${DARBSTUS.m} | darbuotojas`, `${DARBSTUS.f} | darbuotoja`],
];
const STRENGTHS: EntityDef[] = STRENGTH_ROWS.map(([id, en, kind, m, f]) =>
  ent(id, en, ltOf(m, "m"), "m", { ltF: ltOf(f, "f"), art: kind === "noun" ? "a" : "", attrs: { kind } }));
/** Recognised strengths (grammar slot {strength:trait}; more than the chips show). */
const STRENGTH_LEX = [
  { id: "organized", forms: ["organized", "well organized", "organised", "structured", "organization", "organizational skills", "organization skills", "good organization", "very organized person", "an organized person", "organized person"] },
  { id: "hardworking", forms: ["hardworking", "hard working", "diligent", "a hard worker", "hard worker", "hard work", "diligence", "a hardworking person", "hardworking person"] },
  { id: "reliable", forms: ["reliable", "dependable", "trustworthy", "reliability", "a reliable person", "reliable person"] },
  { id: "responsible", forms: ["responsible", "responsibility", "a responsible person", "responsible person", "a sense of responsibility"] },
  { id: "patient", forms: ["patient", "patience", "a patient person", "patient person"] },
  { id: "flexible", forms: ["flexible", "adaptable", "flexibility"] },
  { id: "creative", forms: ["creative", "creativity", "a creative person", "creative person", "full of ideas"] },
  { id: "friendly", forms: ["friendly", "sociable", "outgoing", "a people person", "people person", "open", "communicative person", "a friendly person", "friendly person", "kind"] },
  { id: "punctual", forms: ["punctual", "always on time", "punctuality", "never late"] },
  { id: "motivated", forms: ["motivated", "driven", "enthusiastic", "motivation", "highly motivated"] },
  { id: "positive", forms: ["positive", "optimistic", "positive attitude", "a positive attitude", "a positive person", "positive person"] },
  { id: "calm", forms: ["calm", "calm under pressure", "calm under stress", "relaxed", "calmness", "stress resistant", "resistant to stress", "calm in stressful situations"] },
  { id: "honest", forms: ["honest", "honesty", "an honest person", "honest person"] },
  { id: "detail_oriented", forms: ["detail oriented", "detail-oriented", "careful", "precise", "accurate", "thorough", "attention to detail", "attention to details", "accuracy", "precision"] },
  { id: "energetic", forms: ["energetic", "energy", "full of energy"] },
  { id: "independent", forms: ["independent", "self motivated", "self-motivated", "independence"] },
  { id: "curious", forms: ["curious"] },
  { id: "ambitious", forms: ["ambitious"] },
  { id: "proactive", forms: ["proactive", "full of initiative", "initiative"] },
  { id: "loyal", forms: ["loyal", "loyalty"] },
  { id: "efficient", forms: ["efficient", "productive", "efficiency"] },
  { id: "helpful", forms: ["helpful", "always ready to help", "ready to help"] },
  { id: "team_player", forms: ["team player", "a team player", "good team player", "a good team player", "great team player", "a great team player", "real team player", "a real team player", "team worker", "teamwork", "team work", "working in a team", "good in a team", "good in teamwork", "good at teamwork"] },
  { id: "good_listener", forms: ["good listener", "a good listener", "great listener", "a great listener"] },
  { id: "problem_solver", forms: ["problem solver", "a problem solver", "good problem solver", "a good problem solver", "problem solving", "solving problems", "problem solving skills"] },
  { id: "fast_learner", forms: ["fast learner", "a fast learner", "quick learner", "a quick learner", "learning fast", "learning quickly", "quick learning"] },
  { id: "communicator", forms: ["good communicator", "a good communicator", "great communicator", "a great communicator", "communicative", "communication", "communication skills", "good communication skills", "good communication"] },
  { id: "multitasker", forms: ["good at multitasking", "a good multitasker", "multitasker", "multitasking"] },
  { id: "experienced", forms: ["experienced", "very experienced", "skilled", "professional", "qualified"] },
];

/** What the learner does at work → the job ("I teach math" → teacher). Past forms the engine can't derive are listed. */
const DUTY_LEX = [
  { id: "teacher", forms: ["teach", "teach children", "teach kids", "teach students", "teach at a school", "teach in a school", "teach at school", "teach math", "teach english", "teach history", "teach music", "teach languages", "teach at a high school", "taught", "taught children", "taught kids", "taught at a school", "taught math", "taught english"] },
  { id: "truck_driver", forms: ["drive a truck", "drive trucks", "drive a lorry", "drive big trucks"] },
  { id: "driver", forms: ["drive a bus", "drive a taxi", "drive for uber", "drive a van", "deliver packages", "deliver parcels", "deliver food", "drive buses", "drive taxis", "drive people"] },
  { id: "mechanic", forms: ["repair cars", "fix cars", "repair trucks", "fix trucks", "repair engines", "repair machines", "fix machines"] },
  { id: "chef", forms: ["cook", "cook in a restaurant", "cook food", "cook in a kitchen", "work in a kitchen", "make food in a restaurant"] },
  { id: "salesperson", forms: ["sell things", "sell clothes", "sell cars", "sell products", "sell phones", "sell furniture", "sold cars", "sold clothes", "sold products"] },
  { id: "cleaner", forms: ["clean offices", "clean houses", "clean buildings", "clean hotel rooms"] },
  { id: "construction_worker", forms: ["build houses", "build buildings", "built houses", "work on construction sites", "work on a construction site", "work at a construction site"] },
  { id: "hairdresser", forms: ["cut hair", "do hair", "cut and color hair"] },
  { id: "programmer", forms: ["write code", "write programs", "make websites", "build websites", "develop software", "develop websites", "make apps", "write software"] },
  { id: "designer", forms: ["design websites", "design clothes", "design logos", "make designs", "design interiors"] },
  { id: "translator", forms: ["translate", "translate documents", "translate texts", "translate books"] },
  { id: "nurse", forms: ["take care of patients", "look after patients", "help patients", "take care of old people", "look after old people", "care for patients", "take care of sick people", "help doctors", "work with patients"] },
  { id: "accountant", forms: ["do accounting", "do the books", "do bookkeeping", "do taxes", "prepare taxes", "do the accounts"] },
  { id: "electrician", forms: ["do electrical work", "install electrical systems", "fix electrical problems"] },
  { id: "plumber", forms: ["fix pipes", "repair pipes", "install pipes"] },
  { id: "carpenter", forms: ["make furniture", "build furniture", "make things from wood", "work with wood"] },
  { id: "baker", forms: ["bake bread", "bake cakes", "make bread", "make cakes"] },
  { id: "warehouse_worker", forms: ["pack boxes", "pack orders", "drive a forklift", "pick orders"] },
  { id: "farmer", forms: ["work on a farm", "grow vegetables", "have a farm"] },
  { id: "waiter", forms: ["serve food", "wait tables", "serve customers in a restaurant", "work in a restaurant as a waiter"] },
  { id: "cashier", forms: ["work at the cash register", "work at the checkout", "work at a cash register"] },
  { id: "store_manager", forms: ["manage a store", "manage a shop", "run a store", "run a shop"] },
  { id: "project_manager", forms: ["manage projects", "lead projects", "run projects"] },
  { id: "manager", forms: ["manage people", "manage a team", "lead a team", "manage teams", "lead teams", "manage a department"] },
  { id: "logistics_coordinator", forms: ["plan deliveries", "organize transport", "organize deliveries", "plan transport", "plan routes"] },
  { id: "journalist", forms: ["write articles", "write for a newspaper", "write for a magazine", "write news"] },
  { id: "photographer", forms: ["take photos", "take pictures", "take photographs"] },
  { id: "receptionist", forms: ["work at the reception", "work at the front desk", "work at reception", "answer phones", "answer the phone"] },
  { id: "customer_service_rep", forms: ["answer customer calls", "help customers on the phone", "talk to customers on the phone", "answer calls from customers"] },
  { id: "security_guard", forms: ["guard buildings", "work in security", "work as security"] },
  { id: "tour_guide", forms: ["show tourists the city", "take tourists around", "give tours"] },
  { id: "pharmacist", forms: ["sell medicine", "sell medicines"] },
];

// ---------------------------------------------------------------------------
// Languages

const LANG_ROWS: [string, string, string, string[]][] = [
  ["lithuanian", "Lithuanian", "lietuvių", ["lietuviu"]], ["english", "English", "anglų", []], ["russian", "Russian", "rusų", []],
  ["polish", "Polish", "lenkų", []], ["german", "German", "vokiečių", []], ["french", "French", "prancūzų", []],
  ["spanish", "Spanish", "ispanų", []], ["latvian", "Latvian", "latvių", []], ["ukrainian", "Ukrainian", "ukrainiečių", []],
  ["italian", "Italian", "italų", []], ["norwegian", "Norwegian", "norvegų", []], ["swedish", "Swedish", "švedų", []],
  ["danish", "Danish", "danų", []], ["finnish", "Finnish", "suomių", []], ["estonian", "Estonian", "estų", []],
  ["portuguese", "Portuguese", "portugalų", []], ["chinese", "Chinese", "kinų", ["mandarin"]], ["belarusian", "Belarusian", "baltarusių", []],
];
const LANGUAGES: EntityDef[] = LANG_ROWS.map(([id, en, lt, forms]) =>
  ent(id, en, ["kalba", "kalbos", "kalbai", "kalbą", "kalba", "kalboje"].map((f) => `${lt} ${f}`).join("/"), "f", { forms }));

// ---------------------------------------------------------------------------
// Value slots

const THIS_YEAR = 2026;
const TIME_UNITS: Record<string, number> = { years: 1, year: 1, yrs: 1, months: 1 / 12, month: 1 / 12, weeks: 1 / 52, week: 1 / 52 };
/** Durations in years: "ten years", "about 10 years", "a couple of years", "six months", "a year and a half". */
const durSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  let i = pos;
  const two = `${tokens[i]} ${tokens[i + 1]}`;
  if (["more than", "less than", "just over", "just under", "a little", "a bit"].includes(two) && tokens[i + 2] !== undefined) i += 2;
  else if (["about", "around", "almost", "nearly", "over", "roughly", "approximately", "under", "maybe", "probably"].includes(tokens[i])) i += 1;
  const qs: { end: number; v: number; tag?: string }[] = [];
  const t0 = tokens[i];
  if (t0 === "a" || t0 === "one") {
    if (tokens[i + 1] === "couple") qs.push({ end: tokens[i + 2] === "of" ? i + 3 : i + 2, v: 2 });
    else if (tokens[i + 1] === "few") qs.push({ end: i + 2, v: 3 });
    else if (t0 === "a" && tokens[i + 1] === "lot" && tokens[i + 2] === "of") qs.push({ end: i + 3, v: 10, tag: "many" });
    else qs.push({ end: i + 1, v: 1 });
  }
  if (t0 === "few" || t0 === "several") qs.push({ end: i + 1, v: t0 === "few" ? 3 : 4 });
  if (t0 === "many" || (t0 === "lots" && tokens[i + 1] === "of")) qs.push({ end: t0 === "many" ? i + 1 : i + 2, v: 10, tag: "many" });
  if (t0 === "half" && tokens[i + 1] === "a") qs.push({ end: i + 2, v: 0.5 });
  for (const r of readInt(tokens, i, false)) {
    qs.push({ end: r.end, v: r.value });
    if (tokens[r.end] === "or") for (const r2 of readInt(tokens, r.end + 1, false)) qs.push({ end: r2.end, v: (r.value + r2.value) / 2 });
  }
  for (const q of qs) {
    const mult = TIME_UNITS[tokens[q.end]];
    if (!mult) continue;
    const v = q.v * mult;
    out.push({ end: q.end + 1, value: v, tags: q.tag ? [q.tag] : [] });
    if (tokens[q.end + 1] === "and" && tokens[q.end + 2] === "a" && tokens[q.end + 3] === "half") out.push({ end: q.end + 4, value: v + 0.5 * mult });
  }
  return out;
};

const isDollar = (w?: string) => w === "dollars" || w === "dollar" || w === "bucks";
/** Money in dollars: "50,000", "$50,000", "fifty thousand", "50k", "25". */
const amountSlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  const t0 = tokens[pos];
  const k = t0?.match(/^(\d+)k$/);
  if (k) out.push({ end: pos + 1, value: parseInt(k[1], 10) * 1000 });
  for (const r of readInt(tokens, pos, false)) {
    const v = r.value, i = r.end;
    out.push({ end: i, value: v });
    if (!r.words) {
      if (isDollar(tokens[i]) && /^\d{3}$/.test(tokens[i + 1] ?? "")) out.push({ end: i + 2, value: v * 1000 + parseInt(tokens[i + 1], 10) });
      if (/^\d{3}$/.test(tokens[i] ?? "")) out.push({ end: i + 1, value: v * 1000 + parseInt(tokens[i], 10) });
    }
    if (tokens[i] === "thousand" || tokens[i] === "k" || tokens[i] === "grand") out.push({ end: i + 1, value: v * 1000 });
  }
  return out;
};

/** A short free-form story (teamwork example): 3–16 words without negation. Costly, contextual only. */
const NEG = new Set(["not", "no", "never", "without", "nothing", "none", "neither", "nor", "nobody", "nope", "nah"]);
const storySlot: SlotFn = (tokens, pos) => {
  const out: SlotResult[] = [];
  for (let len = 3; len <= 16 && pos + len <= tokens.length; len++) {
    if (tokens.slice(pos, pos + len).some((w) => NEG.has(w))) break;
    out.push({ end: pos + len, value: tokens.slice(pos, pos + len).join(" "), cost: 3 + 0.1 * len });
  }
  return out;
};

// ---------------------------------------------------------------------------
// State helpers

interface Me { job?: string; field?: string; years?: number; noExp?: boolean; grad?: boolean; between?: boolean; own?: boolean; student?: boolean; from?: string }
const me = (c: Ctx) => c.s.me as Me;
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const heard = (c: Ctx) => c.heard.toLowerCase();

/** Per-turn scratch: one answer may arrive as several segments. */
const turnData = new WeakMap<object, Record<string, any>>();
function turn(c: Ctx): Record<string, any> {
  let d = turnData.get(c);
  if (!d) { d = {}; turnData.set(c, d); }
  return d;
}
/** Say one short reaction per turn. */
function ackOnce(c: Ctx, line: string, vars?: Record<string, any>) {
  const d = turn(c);
  if (d.acked) return;
  d.acked = true;
  d.aboutAck = null;
  c.say(line, vars);
}

const aboutKnown = (c: Ctx) => !!(me(c).job || me(c).field || me(c).own || me(c).student);
const aboutDone = (c: Ctx) => {
  const m = me(c);
  if (c.s.aboutAsks >= 5 || (c.s.aboutStall >= 2 && c.s.aboutInfo === c.s.aboutInfoAtAsk)) return true;
  if (aboutKnown(c)) return m.years != null || !!m.noExp || !!m.student;
  // no experience yet: a new graduate is asked what they studied, the others are not pressed
  return !!m.noExp && (!m.grad || !!c.s.studiedAsked);
};
const qOn = (id: string) => (c: Ctx) => c.s.qs.includes(id) && !!c.s.named;
const done = (id: string) => (c: Ctx) => !!c.s.done[id] || asked(c, id) >= 3;
/** How many times a question was asked (every question gives up after a few tries). */
const asked = (c: Ctx, id: string): number => c.s.asks?.[id] ?? 0;
function bump(c: Ctx, id: string) { c.s.asks = c.s.asks || {}; c.s.asks[id] = asked(c, id) + 1; }

// Suggestions

const S_ARRIVE: Suggestion = { lt: "Pasakyti, kad atvykai į darbo pokalbį (ir prisistatyti)", hint: "arrive" };
const S_NAME: Suggestion = { lt: "Pasakyti savo vardą ir pavardę", hint: "name" };
const S_YEARS: Suggestion = { lt: "Pasakyti, kiek metų dirbi", hint: "years" };
const S_STUDIED: Suggestion = { lt: "Pasakyti, ką studijavai", hint: "studied" };
const S_FIELD: Suggestion = { lt: "Pasakyti, kurioje srityje dirbi ir kiek metų", hint: "about_field", options: "field" };
const S_ABOUT_MORE: Suggestion = { lt: "Papasakoti daugiau apie save", hint: "about_more" };
const S_JOB: Suggestion = { lt: "Pasakyti, kuo dirbi (ir kiek metų)", hint: "about_job", options: "job" };
const S_STRENGTH: Suggestion = { lt: "Pasakyti savo stiprybes", hint: "strengths", options: "strength" };
const S_STRENGTH_MORE: Suggestion = { lt: "Papasakoti, ką darai gerai", hint: "strengths_more" };
const S_SIDE: Suggestion = { lt: "Pasakyti, kad jaudiniesi, arba paprašyti pakartoti", hint: "side" };
const S_ASK: Suggestion = { lt: "Paklausti apie darbą: darbo laiką, mokymus, pradžią", hint: "ask_them" };
const S_NO_Q: Suggestion = { lt: "Pasakyti, kad klausimų nebeturi", hint: "no_q" };
const Q_INTENTS = ["q_hours", "q_training", "q_start", "q_team", "q_remote", "q_benefits", "q_day", "q_next", "q_dress", "q_parking", "q_like",
  "salary_range_q", "no_questions", "can_ask", "q_other_ctx"];
/** Model questions in sets of three (hint group, the answer keys it covers). */
const Q_SETS: [string, string[], string][] = [
  ["ask_them", ["hours", "training", "start"], "Paklausti apie darbą: darbo laiką, mokymus, pradžią"],
  ["ask_them2", ["team", "remote", "benefits"], "Paklausti apie komandą, darbą iš namų, naudas"],
  ["ask_them3", ["day", "next", "dress"], "Paklausti apie darbo dieną ir tolesnius žingsnius"],
];

const ABOUT_INTENTS = ["job_is", "job_ctx", "job_does", "field_is", "field_ctx", "experience", "years_ctx", "no_exp", "no_exp_ctx", "between_jobs",
  "own_business", "from", "moved", "family", "age", "about_name_ctx", "about_end", "what_know", "intro_name"];
const STRENGTH_INTENTS = ["strength", "strength_ctx", "not_strength", "hire_ans"];

/** Answers the simulations give to Ms. Brooks's optional questions (the core questions are scripted). */
const AUTO: Record<string, string> = {
  found: "Yes, it was easy to find.", drink: "No, I'm fine, thanks.", leaving: "I moved here with my family.",
  weakness: "Sometimes I work too hard.", improve: "I'm learning to say no.", future: "I'd like to lead a team.",
  teamwork: "At my last job, we finished a big project on time.", languages: "I speak Lithuanian, Russian and English.",
  authorized: "Yes, I have a green card.", salary: "Around fifty thousand a year.", range: "Yes, that works for me.",
  start: "I can start next Monday.", hire: "I have the right experience, and I learn fast.", phone: "Sure, no problem.",
  offer: "Thank you! I accept!", closing: "Thank you for your time!",
};

// ---------------------------------------------------------------------------

export const interview: SituationDef = {
  id: "s87-interview",
  song: 87,
  songTitle: "Why Should We Hire You?",
  title: { en: "Why Should We Hire You?", lt: "Kodėl turėtume priimti Jus į darbą?" },
  topic: { en: "A job interview", lt: "Darbo pokalbis" },
  chapter: 4,
  order: 1,
  location: "office",
  npc: "brooks",
  goal: "Sėkmingai atsakyk į darbo pokalbio klausimus.",
  intro: "„Brightline“ biuras, 9:30. Tavęs laukia personalo vadovė ponia Bruks. Tai darbo pokalbis: papasakok apie save ir savo patirtį, stiprybes, pasakyk, kodėl nori čia dirbti, ir nepamiršk pats paklausti apie darbą.",
  entities: { job: JOBS, field: FIELDS, strength: STRENGTHS, language: LANGUAGES },

  mission: [
    { lt: "Prisistatyk", done: (c) => !!c.s.arrived && (!!c.s.named || c.s.nameAsked >= 3) },
    { step: "about", lt: "Papasakok apie savo darbą" },
    { step: "why", lt: "Pasakyk, kodėl nori čia dirbti" },
    { step: "strengths", lt: "Įvardink savo stiprybes" },
    { lt: "Atsakyk į kitus klausimus", optional: true, when: (c) => (c.s.qs || []).length > 0, done: (c) => extrasDone(c) },
    { step: "questions", lt: "Paklausk apie darbą" },
  ],

  grammar: {
    macros: {
      ms: "(ms | miss | missus | mz | mizz | misses)",
      the_brooks: "@ms brooks",
      interview: "(interview | job interview | appointment)",
      very: "[very | really | quite | pretty | extremely | super | so | always]",
      exp_tail: [
        "with {dur} of [work] experience", "with {dur} experience #tip:us_years_of", "[for] {dur}", "since {year}",
        "with (a lot of | lots of | many years of | plenty of) experience #many", "@dur_tail", "with my own (salon | business | shop | company | restaurant | cafe)",
      ],
      money: "[about | around | roughly | approximately | at least | maybe | like] {amount} [dollars | bucks] [(a | per | an) (year | month | hour | week)] [before taxes]",
      country_place: "(here | to maple harbor | to the (us | u s | united states | states | usa) | to america | to this country)",
      bc: "[because | i think [that] | i believe [that] | i feel [that] | because i think [that]]",
      doing: "(working | teaching | doing (this | it | that) | driving | cooking | coding | programming | designing | building houses | selling | nursing | cleaning | writing | translating | baking | managing (people | teams | projects | a team) | leading (a team | teams))",
      sal_pre: "[i am (looking for | hoping for | expecting | thinking of | thinking about) | i (would like | expect | want) [to (make | earn | get)] | i was thinking | my (expectation is | expectations are) | i would be (happy | fine | okay) with | i think]",
      // "I'm a teacher twenty years already", "ten years already"
      dur_tail: "(already | now) [for] {dur} | {dur} (already | now)",
      // "My (biggest) weakness is (that) …", "I'd say …"
      wk_pre: "[my [greatest | biggest | main | only | worst] (weakness | problem) (is | would be) [probably | maybe] [that] | i would say [that] | i guess [that] | to be honest]",
      // where the company is good: "famous", "stable", "international"
      co_adj: "(great | good | very good | growing | successful | friendly | well known | famous | popular | stable | big | international | modern | interesting | strong | reliable | respected)",
      workplace: "(here | at brightline | in (this | your | the) company | with (this | your | the) company | with you | in your team | on your team)",
      auth_papers: "(green card | work permit | work visa | visa | employment authorization | work authorization | papers | documents | social security number | ssn)",
      workplace_noun: "[a | an | the | my] [big | small | local | private | public] (hospital | clinic | school | kindergarten | university | bank | hotel | restaurant | cafe | factory | company | store | shop | supermarket | warehouse | office | law firm | construction company | logistics company | transport company | it company | call center | pharmacy | airport | farm)",
    },
    slots: {
      dur: { fn: durSlot },
      amount: { fn: amountSlot },
      story: { fn: storySlot },
      trait: { lexicon: STRENGTH_LEX },
      duty: { lexicon: DUTY_LEX },
      country: { lexicon: [
        { id: "lithuania", forms: ["lithuania", "lithuanian", "vilnius", "kaunas", "klaipeda"] },
        { id: "other", forms: ["latvia", "estonia", "poland", "ukraine", "germany", "norway", "sweden", "ireland", "england", "the uk", "belarus", "russia", "latvian", "polish", "ukrainian", "german"] },
      ] },
    },
  },

  intents: {
    // --- arriving -------------------------------------------------------------
    arrive: { patterns: [
      "i have [an | a | my] @interview [today] [(at | for) {time}] [today] [with @the_brooks] #h:have_interview",
      "i have [an | a | my] @interview with @the_brooks [(at | for) {time}]",
      "i have [an | a | my] {time} @interview [today] [with @the_brooks]",
      "i am here for [an | a | my | the] [{time}] @interview [(at | for) {time}] [with @the_brooks] #h:here_for",
      "i am here (to see | to meet | for) @the_brooks [(at | for) {time}] #brooks #h:here_see",
      "i am (looking for | here to see | supposed to meet) @the_brooks [(at | for) {time}] #brooks",
      "i am (here | the candidate) for the (position | job) [interview]",
      "i am here (about | for) the (job | position | job opening | opening) [interview]",
      "i am here (about | for) the vacancy #tip:us_position",
      "i (came | have come | am coming) (for | to) [an | the | my] @interview",
      "i was invited (for | to) [an | a | the] @interview [today] [(at | for) {time}] [with @the_brooks]",
      "i have a meeting with @the_brooks [(at | for) {time}] #brooks",
      "i am [a | the] candidate [for the (position | job | interview | {job} position)]",
      "i am here for the {job} (position | job) [interview]",
      "[yes] (for | about) [the | an | my] @interview [at {time}]", "@the_brooks is (expecting | waiting for) me #brooks", "my @interview is (at {time} | today | now | with @the_brooks)",
      "i am here to (see | meet) the (hr manager | hr | manager | hiring manager | person from hr)", "i am here to interview for the (job | position | {job} position)",
      "(are you | is this) @the_brooks #brooks", "is @the_brooks (here | in | available | in the office) #brooks",
      "(yes | yeah) (i am | i do | that is right | that is me | that is correct) i (have | am here for) [an | a | my | the] @interview [(at | for) {time}] [today]",
      "i am here for a (meeting | appointment) with @the_brooks [(at | for) {time}] #brooks",
      "i am [a (bit | little) | a few minutes] early [for (my | the) interview] #early",
      "@the_brooks #brooks", "where is the (interview | job interview | hr office | hr department)",
    ] },
    intro_name: { patterns: [
      "my name is {name} #h:my_name", "my name is {name} and i (have an interview | am here for an interview)",
      "my [first] name is {name} and my (surname | last name | family name) is {surname:name}",
      "my (surname | last name | family name) is {name}", "{name} is my name", "the name is {name}", "(you can | please) call me {name}", "i am called {name}", "name is {name}",
    ] },
    intro_ctx: { patterns: ["i am {name} #h:intro_full", "{name}", "it is {name}", "this is {name}", "me {name}"] },

    // --- small talk ------------------------------------------------------------
    found_ok: { patterns: [
      "[yes] (it was | that was) (easy | very easy | no problem | fine) [to find] #h:found_easy", "[yes] no problem [at all] #h:found_no_problem",
      "[yes] i found (it | you | the office) (easily | quickly | with no problem | without any problems)", "[yes] it was easy to find",
      "[yes] (the gps | my gps | google maps | the map | my phone) (helped | worked) [me]", "[yes] i took (a taxi | an uber | the bus | a bus | a cab)",
      "[yes] i (walked | drove | came by car | came by bus)", "[yes] it is (easy | very easy) to find",
      "[yes] i used (gps | the gps | my gps | google maps | the map | my phone | navigation)", "[yes] (easily | very easily | quickly | no problems)",
      "[yes] [it was] (very | really | pretty | quite) (easy | simple)", "[but] i found (it | you | the office | the building) [easily | quickly | in the end | at last]", "[yes] it was (fine | okay | all right | no problem)",
    ] },
    found_hard: { patterns: [
      "[no | not really | not exactly] i got [a little | a bit] lost [a little | a bit] #h:found_lost", "[no] it was (hard | difficult | not easy) [to find]",
      "[no] it was [a little | a bit | a little bit | quite | very | really] (hard | difficult | tricky | complicated) [to find]",
      "[no] i could not find (it | the building | the entrance | the office) [at first]", "[no] it took (a while | some time | me a while)",
      "[no] the traffic was (bad | terrible | awful | crazy)", "not exactly",
    ] },
    want_drink: { patterns: [
      "[yes] (some | a glass of | a bottle of | a cup of) water [would be (great | nice | lovely | perfect)] #h:water",
      "[yes] water [would be (great | nice | lovely | perfect)]", "[yes] (just | only) water",
      "[yes] [a | some | a cup of] coffee [would be (great | nice | lovely | perfect)] [with milk | black | with sugar] #coffee",
      "(can | could | may) i (have | get) (some | a glass of) water", "(can | could | may) i (have | get) [a | some | a cup of] coffee [with milk | black] #coffee",
      "i would (love | like) [a | some | a cup of] coffee #coffee", "i would (love | like) [some | a glass of] water",
    ] },
    no_drink: { patterns: [
      "[no] i am (fine | good | okay | all right) [for now] #h:no_fine", "[no] nothing for me", "[no] i do not need anything", "[no] i am good for now",
      "[no] nothing [else]", "[no] no (coffee | water | drink) for me", "[no] no (coffee | water) [thank you | thanks]", "i (do not | will not) (want | need) (coffee | water | anything) [right now]",
    ] },

    // --- about you ---------------------------------------------------------------
    job_is: { patterns: [
      "[well] i am [a | an] [trained | qualified | certified | senior | junior | professional] {job} [@exp_tail] #h:job_im",
      "i work as [a | an] {job} [@exp_tail] #h:job_work_as",
      "i have been [a | an] {job} ([for] {dur} | since {year}) #h:job_been",
      "i have (worked | been working) as [a | an] {job} [[for] {dur} | since {year}]",
      "i (worked | was working) as [a | an] {job} [in lithuania | back home | before] [[for] {dur}] #h:job_was",
      "i was [a | an] {job} [in lithuania | back home | before] [[for] {dur}]",
      "(in lithuania | back home) i (was | worked as) [a | an] {job} [[for] {dur}]",
      "my (job | profession | position | job title) (is | was) [a | an] {job}",
      "i am [a | an] {job} by profession",
      "i used to (be [a | an] {job} | work as [a | an] {job}) [in lithuania | back home | before] [[for] {dur}]",
      // Lithuanian calques and other orders: "I work like accountant", "Ten years I work as a driver", "By profession I'm an engineer"
      "i (work | am working | worked | was working) like [a | an] {job} [@exp_tail]",
      "[for] {dur} i (work | am working | have worked | have been working | worked) (as | like) [a | an] {job}",
      "i (worked | have worked | work | was working) [for] {dur} (as | like) [a | an] {job}",
      "by profession i am [a | an] {job} [@exp_tail]", "i am [a | an] {job} (at | in) @workplace_noun [@exp_tail]",
      "i (work | worked | am working | was working) as [a | an] {job} (at | in | for) @workplace_noun [@exp_tail]",
      "my (last | previous | current | old) (job | position | job title) (is | was) [a | an] {job}",
      "i have been working as [a | an] {job} @dur_tail",
      "(now | currently | at the moment | right now | today) i (work | am working) (as | like) [a | an] {job} [@exp_tail]", "(now | currently | at the moment | right now) i am [a | an] {job} [@exp_tail]",
    ] },
    job_ctx: { patterns: ["[a | an] {job} [@exp_tail]", "i am still [a | an] {job}"] },
    // "I teach math", "I drive a truck", "I repair cars": what the learner does → the job (Ms. Brooks echoes it)
    job_does: { patterns: [
      "[and] i [also | usually | mostly | still | now] {duty} [every day | for a living | at work | there] [(at | in) @workplace_noun] [@exp_tail]",
      "[and] i (used to | have been) {duty} [in lithuania | back home | before] [@exp_tail]",
      "my (job | work) is to {duty}", "[for] {dur} i {duty}",
    ] },
    field_is: { patterns: [
      "i work in {field} [@exp_tail] #h:f_work_in",
      "i (have worked | have been working) in {field} ([for] {dur} | since {year}) #h:f_years",
      "i (worked | was working) in {field} [in lithuania | back home | before] [[for] {dur}]",
      "my background is in {field} #h:f_background", "i have (a | some) background in {field}",
      "i (studied | have a degree in) {field}", "my (field | area) is {field}", "i am in {field}", "i used to work in {field} [[for] {dur}]",
      "i have been in {field} ([for] {dur} | since {year})", "i (graduated in | graduated from | have a diploma in | have a masters in | have a bachelors in | studied at university) {field}",
      "i (finished | studied | graduated) {field} [at (university | college | school | the university)] [in (lithuania | vilnius | kaunas | klaipeda)]",
      "i (worked | have worked | work | was working) {dur} in {field}",
      "i (do | am doing) {field} [@exp_tail]", "my (job | work) is in {field} [@exp_tail]", "i am working in {field} [@exp_tail]",
      "[for] {dur} i (work | am working | have worked | have been working | worked) in {field}",
      "i (work | worked | am working) with {field} [@exp_tail]",
      "i (worked | was working | work | am working | have worked) (in | at) {country} (in | on | at | with) {field} [@exp_tail]", "i (worked | was working) (in | on | at) {field} in {country} [@exp_tail]",
      "i (work | am working | worked) (at | for) {field} [@exp_tail]", "i have been working in {field} @dur_tail",
    ] },
    field_ctx: { patterns: ["[in] {field} [@exp_tail]", "mostly [in] {field}"] },
    experience: { patterns: [
      "i have [got] {dur} of [work] experience [in {field} | as [a | an] {job} | in (this | the | my) (field | area | industry | job)] #h:f_exp",
      "i have [got] {dur} experience [in {field} | as [a | an] {job} | in (this | the | my) (field | area | industry | job)] #tip:us_years_of",
      "i have been @doing ([for] {dur} | since {year})",
      "i have (worked | been working) [for] {dur}",
      "i (work | worked | am working | have worked) [for] {dur} (in | at) @workplace_noun", "i (work | worked | am working) [for] {dur} [already | now] [in lithuania | here | there]",
      "i have (a lot of | lots of | a lot | many years of | plenty of) experience [in {field}] #many",
      "i have [a] (big | great | good | huge | long | much | strong | rich) experience [in {field} | as [a | an] {job}] #many",
      "i have some experience [in {field}] #some",
      "{dur} of [work] experience [in {field} | as [a | an] {job}]",
    ] },
    years_ctx: { patterns: [
      "[for] {dur} [now | already]", "since {year}", "[for] (a long time | many years | a long while) #many", "not (long | very long) #few",
      "already {dur}", "{dur} (in total | altogether | all together)",
    ] },
    no_exp: { patterns: [
      "i (do not | did not) have (much | any | a lot of) [work] experience [yet] [in {field} | in this field] #h:no_exp",
      "i have no [work] experience [yet]", "i have (little | very little) experience",
      "(this is | this would be | it would be | it is) my first (job | real job | job here | job in (the us | america | the states))",
      "i (just | recently) (finished | graduated from) (school | university | college) #grad", "i am new to (this | the) field",
      "i [just | recently] (finished | graduated from | graduated) (school | university | college | my studies) [last year | this year | {dur} ago | in {year} | this summer | in (may | june)] #grad",
    ] },
    age: { patterns: ["i am {number} [years old]"] },
    not_job: { patterns: [
      "i am not [a | an] {job} [anymore]", "i (do not | never) work (in {field} | as [a | an] {job})", "i (never | did not) work (in {field} | as [a | an] {job})",
      "i (do not | don't) have {dur} [of] experience",
    ] },
    studied_unknown: { patterns: ["i (studied | have a degree in) {w:any}"] },
    about_name_ctx: { patterns: ["i am {name}"] },
    no_exp_ctx: { patterns: ["not (much | a lot) [yet]", "(none | no experience) [yet]"] },
    between_jobs: { patterns: [
      "i am (looking for a job | between jobs | job hunting | unemployed) [right now | at the moment]",
      "i am not working (right now | at the moment)", "i do not have a job [right now | at the moment]", "i (lost | left) my (job | last job)",
      "i (am | was) [a] (housewife | stay at home (mom | mother | dad | parent)) [[for] {dur}]", "i was at home with my (kids | children | baby) [[for] {dur}]", "i am (retired | on maternity leave)",
    ] },
    own_business: { patterns: [
      "i (have | had | run | ran) my own (business | company | shop | store | restaurant)", "i am self employed",
      "i (have | had | run | ran | used to have) my own [small | little | family | own] (business | company | shop | store | restaurant | cafe | firm)",
      "i (am | was) (a freelancer | a business owner | an entrepreneur)",
    ] },
    from: { patterns: [
      "i am [originally] from {country} #h:from_lt", "i come from {country}", "i am {country}", "i was born in {country}",
    ] },
    moved: { patterns: [
      "i [just | recently] moved @country_place [{dur} ago | last (year | month | week | spring | summer | fall | winter) | this (year | month)] [with my family] #h:moved",
      "i have been (here | in the (us | states | united states) | in maple harbor | in america) [for] {dur}",
      "i (came | arrived) (here | to the (us | states | united states)) [{dur} ago | last (year | month)]",
      "we [just | recently] moved @country_place [{dur} ago | last (year | month)]",
    ] },
    family: { patterns: [
      "i am married [with {number} (kids | children)] [and i have {number} (kids | children)]", "i have (a | {number}) (kid | kids | children | son | sons | daughter | daughters)",
      "i am (single | divorced)", "i live with my (family | wife | husband | partner)",
      "i am [a] (mother | father | mom | dad) [of {number} [(kids | children)]]", "i am (a widow | a widower | engaged)", "we have {number} (kids | children)",
    ] },
    free_time_unknown: { patterns: [
      "(in my free time | in my spare time | outside of work | outside work) i (like | love | enjoy) {w:any}", "my hobbies are {w:any}",
      "i (like | love | enjoy) (reading | hiking | cooking | running | sports | music | traveling | travelling | fishing | gardening | swimming | cycling | yoga | dancing | painting | photography | football | soccer | basketball | going to the gym)",
    ] },
    about_end: { patterns: ["that is (about | pretty much) it", "that is all [about me]", "that is me [in a nutshell]"] },
    what_know: { patterns: [
      "what (do you want | would you like) to know", "what (should | do) i (say | tell you)", "(where | how) (should | do) i (start | begin)",
      "about (me | my work | my experience)",
    ] },

    // --- why a new job ----------------------------------------------------------
    leaving_ans: { patterns: [
      "[because] i [just | recently] moved @country_place [with my family] #h:l_moved",
      "[because] i am looking for (a new challenge | new challenges | something new | more responsibility | a change) #h:l_challenge",
      "[because] i (want | would like) to (grow | learn | try something new | change careers | work in {field} | use my english) [professionally | more]",
      "[because] my (old | last | previous) (job | work | office) was too far [away] [from (home | my home | my house)]",
      "[because] my (contract | project | job) (ended | finished)", "[because] the company (closed | moved | went out of business)",
      "[because] i (want | need) (more money | a higher salary | a better salary) #tip:neg_money",
      "[because] i did not like my (boss | manager | job | company) #tip:neg_boss",
      "[because] i (want | need | am looking for | would like) (more responsibility | new challenges | a new challenge | something new | a change | a better job | better opportunities | more opportunities | a new job | new experience | a stable job) [now]",
      "[because] (the | my | our) [old | last | previous] company (closed | moved | went out of business | went bankrupt | closed down | shut down | was sold | had problems)",
      "[because] (the | my | our) (project | contract | job) (ended | finished | was over)", "[because] they closed (our | my | the) (department | office | factory | store | shop | company)",
      "[because] there (was | were) no (opportunities | opportunity | possibility | possibilities | chance | chances | room) (to | for) (grow | growth | develop | learn | move up) [there | anymore]",
      "[because] i could not grow (there | anymore) [anymore]", "[because] i was there (too long | for too long | for many years)",
      "[because] (my family | my husband | my wife | we) [just | recently] moved @country_place [so i had to (leave | quit) [my job]]",
      "[because] i want to work (closer to home | near my home | near home | closer to my home | in maple harbor)",
      "[because] i (want | would like) to (work | be) (in | with | on) a (bigger | larger | new | international | good | great | young | friendly | stronger) team [and (learn | grow) [new things | more]]",
      "[because] i (want | would like) to (learn | try) new things [and grow]",
      "[because] i (want | need | am looking for) a (job | position | role) with more (responsibility | opportunities | money | growth | possibilities)",
      "[because] i (was laid off | lost my job | was fired #tip:neg_boss)", "[because] i want to (change | switch) (my career | careers | my profession | fields)",
      "[because] the (salary | pay | money) was (too low | not enough | bad | too small | small | low) #tip:neg_money", "[because] i (want | need) (to earn more | more money) #tip:neg_money",
    ] },

    // --- why here -----------------------------------------------------------------
    why_ans: { patterns: [
      "@bc i [really] (love | like) your (company | products | team | office | work | services) [and your (team | products | company)] #h:w_like",
      "@bc i (have heard | heard) (great | good | a lot of good | wonderful | only good) things about (brightline | your company | you | the company) #h:w_heard",
      "@bc i (have heard | heard) (many | so many | lots of | a lot of | very) (great | good | nice | wonderful) things about (brightline | your company | you | the company | this company)",
      "@bc i (have heard | heard | read) [that] (it is | brightline is | your company is | this is | the company is) a (good | great | nice | wonderful | friendly | successful) (company | place to work | place)",
      "@bc (brightline | your company | it | the company) (is | seems) a (great | good | growing | successful | friendly | well known | interesting | good) (company | place to work | team) #h:w_company",
      "[because] (your company | brightline | the company) has a (great | good | very good) reputation #h:w_reputation",
      "[because] i (want | would like) to (grow | learn | develop) [professionally | new skills | and learn new things | and grow | with the company | new things] #h:w_grow",
      "[because] i (want | would like) to (work | be) (in | with | on) a (bigger | larger | new | international | good | great | young | friendly | strong) team [and (learn | grow) [new things | more]]",
      "@bc (your company | brightline | the company | it) is growing [fast | quickly | very fast | a lot] [and i (want | would like) to (be part of it | be a part of it | grow with it | grow with you | be part of that)]",
      "[because] i (want | would like) to be [a] part of (it | your team | the team | this team | brightline | your company | this company | a growing company)",
      "[because] i am (ready for | looking for) a new challenge #h:w_challenge",
      "[because] i (want | would like) to use my (experience | skills | experience and skills) [here | in this job] #h:w_use",
      "[because] i (like | love | enjoy) working (with people | with customers | with clients | in a team | with numbers | with computers) #h:w_people",
      "@bc (the | this) (job | position) (is | seems | looks) (very interesting | interesting | perfect for me | like a good fit | like a great fit | a (good | great | perfect) fit [for me])",
      "[because] i (want | would like) to work (in | for) a (big | international | good | american | growing) company",
      "[because] i (live | am living) (near here | close by | nearby | in maple harbor)",
      "[because] i need (a | this) job #tip:need_job", "[because] (for the money | the salary is good | the pay is good | good salary | good money) #tip:need_job",
      "@bc (brightline | your company | it | the company) (is | seems) [very] @co_adj [and [very] @co_adj] [company]",
      "@bc i [really] (love | like) (this | the) (company | team | office | place) [very much | a lot]",
      "@bc i (have heard | heard | read | know) (a lot | so much | many things | good things | great things) about (brightline | your company | you | the company | this company)",
      "@bc (the | this) (job | position | role) is (perfect | great | ideal | a good fit | a great fit | right) for (me | my experience | my skills | my profile)",
      "@bc i [really] (love | like | respect | admire) your (values | mission | culture | products and (your | the) values | people | atmosphere | reputation) [and your (values | people | products | team | culture)]",
      "@bc i (like | love | respect) (what you do | the work you do | what your company does | how you work) [here]",
      "@bc i (want | would like) [to] [get | gain | have] (new | more | international | american) experience",
      "[because] i am looking for a (stable | good | long term | permanent | full time | secure | new) (job | position | place to work)",
      "[because] (it is | the office is | brightline is | this is) (close to | near) (my home | my house | where i live | home)",
      "i (read | heard | learned) about (your company | brightline | you | the company | this job | this position) [on the internet | online | on your website | on linkedin | from a friend] [and i (really)? (liked | loved) (it | what i read)]",
      "my (friend | brother | sister | cousin | wife | husband | colleague | neighbor | friends) (works | work | worked) here [and (he | she | they) (says | said | say) (it is | this is) a (great | good | nice) (place | company) [to work]]",
      "@bc i (want | would like) to use my (experience | skills | knowledge | experience and skills) (in (a | this) new (place | job | company | position) | in your company | at brightline | for your company)",
      "i am [very | really] interested in (this | the | your) (position | job | role | company | field | work | products)",
      "(it is | this is | this job is | this position is) a (good | great | big | wonderful | real) (opportunity | chance) [for me]",
      "(the | this) (job | position | role | work) (sounds | seems | looks | is) [very | really] (interesting | exciting | great | perfect for me | like a good fit | like a great fit)",
      "i (like | love | enjoy) (this | the | this kind of) (job | work | field) [very much]",
      "@bc (your company | brightline | it | the company) is the best [company | place to work] [in (the city | town | maple harbor | the area)]",
      "@bc i (can | will | could) learn a lot (here | from you | in this company | in this job | at brightline)",
      "@bc i (want | would like) to (be | become) [a] part of (your | the | this) (team | company)",
      "@bc i (like | love) the (atmosphere | people | office | team | job description | environment | culture | values | location) [here]",
      "@bc i (want | would like) to work (with | in) a (good | great | friendly | professional | young | international | strong) team",
      "@bc i (want | would like) to work (for | in | at) a company like (yours | this | brightline | this one)",
      "@bc i (want | am looking for) a (job | place | company | position) where i can (grow | learn | develop | use my (experience | skills))",
      "@bc (your | the) (products | services | team | people | office) (are | is) [very | really] (good | great | nice | amazing | interesting | friendly)",
      "@bc (your company | brightline | the company | it) has a (good | great | very good) (name | reputation)", "@bc (your company | brightline | the company | it) is growing [fast]",
      "[because] is [a | very] @co_adj (company | place to work | team)", "(good | great | nice) company [and] [(good | great | nice) people]",
      "i (want | need | am looking for) [a] (stable | good | long term | permanent | full time | secure | new | interesting) (job | work | position)",
      "@bc i (want | would like) to work with (people | customers | clients | numbers | computers | a good team)",
    ] },

    // --- strengths ------------------------------------------------------------------
    why_neg: { patterns: [
      "i (do not | don't) [really] (like | love) (your | the) (company | products | team | office)",
      "i (do not | don't) know (much | anything) about (you | brightline | the company | your company)", "i (did not | didn't) hear anything about (you | brightline | the company)",
    ] },

    strength: { patterns: [
      "[because] i am @very {strength:trait} [and {strength:trait}] [and {strength:trait}] #h:s_very",
      "[because] i am [a | an] [real | great | good | very good] {strength:trait}",
      "i would say [that] i am @very {strength:trait} [and {strength:trait}] #h:s_say",
      "(people | my colleagues | my friends | my boss) (say | tell me | would say) [that] i am @very {strength:trait} #h:s_people",
      "my (greatest | biggest | main | best | strongest) (strength | quality) is [that] [i am] [being] @very {strength:trait} [and {strength:trait}]",
      "my strengths are [that i am] {strength:trait} [and {strength:trait}] [and {strength:trait}]",
      "[because] i learn (fast | quickly | new things fast | new things quickly) #fast_learner #h:learn_fast",
      "[because] i am good with (people | customers | clients | numbers | computers | kids | children) #good_with #h:good_people",
      "i get along (well)? with (people | everyone | others | my colleagues)",
      "[because] i work well (in a team | on a team | with others | in teams | with people | under pressure | alone | independently) #team #h:team_well",
      "[because] i am never late #punctual #h:never_late",
      "i (always)? (finish | do) my work on time", "i (never | always) meet (deadlines | my deadlines)", "[and] i always (finish | do) my (work | job | tasks) [on time | well]",
      "i (stay | keep | remain) calm under pressure #calm #h:pressure", "i (stay | keep | remain) calm (under stress | in stressful situations | when there is a problem) #calm",
      "i (speak | know) (two | three | four | five | several | many) languages #langs #h:langs",
      "i am not afraid (to ask [questions] | of hard work | of challenges | to learn | to try new things) #h:not_afraid",
      "i (love | like | enjoy) (learning | to learn | new challenges | challenges | solving problems | helping people)",
      "i am good at (solving problems | problem solving | organizing | planning | communication | communicating | multitasking | teamwork | listening | selling | math | numbers)",
      "i know how to (solve problems | work under pressure | organize my time | work with people)",
      "[because] i am @very {strength:trait} (in my work | at work | at my job | with my work | with people | with customers)",
      "[because] i (never | do not) give up", "i (always)? finish what i start",
      "[because] i (can | know how to) work (well)? under pressure #calm", "i (am good | work well) under (pressure | stress)",
      "[because] i (pay | always pay) [a lot of | great | close] attention to (details | detail | the details | small details)",
      "[because] i work [very | really] hard", "[because] i am a (hard | very hard | good) worker",
      "[because] i (learn | pick up) new things (fast | quickly | very fast | very quickly)", "i am (good | great | very good) (at | in) (teamwork | working in a team | working with people | organizing | planning | communication | solving problems | problem solving | multitasking | listening)",
      "i am (good | great | very good) (with | at) (numbers | computers | people | customers | clients | details | languages | kids | children | technology)",
      "i am [very | really] good at (my job | my work | what i do)", "i (always)? do my best", "i like (order | to be organized | everything organized | everything in order) #organized", "i can learn (fast | quickly | new things [fast | quickly]) [and i work hard]",
      "my (strong | best) (side | point | points | sides | quality) (is | are) [that] [i am] @very {strength:trait} [and {strength:trait}]",
      "i [really] (love | like | enjoy) (my work | my job | working with people | helping people | helping customers | solving problems)",
      "i can work (in a team | on a team | with others | with people) (and | or) (alone | independently | by myself)", "i can work (alone | independently) (and | or) (in a team | on a team | with others)",
      "i have [very | really] [good | great | strong | excellent | a lot of] {strength:trait} [skills]", "i (get | am easy to get) along with (everyone | everybody | people)",
      "(i think)? my (greatest | biggest | main | best | strongest) (strength | quality) is [that] i (learn fast | work hard | never give up | work well in a team | am good with people)",
    ] },
    strength_ctx: { patterns: [
      "@very {strength:trait} [and {strength:trait}] [and {strength:trait}]", "(probably | definitely | maybe) {strength:trait}",
      "{strength:trait} [and {strength:trait}] [and {strength:trait}] (skills | are my strengths | are my strong points)",
      "{strength:trait} [{strength:trait}] [and {strength:trait}] [and {strength:trait}]",
    ] },
    not_strength: { patterns: [
      "[sometimes] i am not @very {strength:trait}", "i am not [a | an] [very | real] {strength:trait}", "i (do not | can not) (learn fast | work well in a team | work under pressure)",
      "i am not (very | so)? good with (people | numbers | computers)",
      "i (do not | can not) work (well)? (under pressure | in a team | with people)", "i am not (a | an)? (hard | good) worker",
      "i (do not | can not) (learn | pick up) new things (fast | quickly)", "i do not (like | enjoy) (my work | working with people | teamwork)",
    ] },

    // --- weaknesses -------------------------------------------------------------------
    weakness: { patterns: [
      "@wk_pre [sometimes] i [sometimes | often] work too (hard | much | long) [sometimes] #h:wk_hard",
      "@wk_pre [sometimes] i [sometimes | often] (take on | do) too much [work] [sometimes] #h:wk_take_on",
      "@wk_pre i am [a bit of | a little bit of | too much of | kind of] a perfectionist [sometimes] #h:wk_perfectionist",
      "@wk_pre [sometimes] i am not (very | so | always | really)? (patient | organized | calm | confident | fast | good with (details | people | computers)) [sometimes | enough]",
      "@wk_pre [maybe] my english (is not | could be better) [perfect | very good | great | the best | good enough | so good] [yet] #h:wk_english",
      "@wk_pre i (need to | want to | would like to) (improve | work on) my english",
      "@wk_pre [sometimes] i am [sometimes | a bit | a little | too | very] (impatient | nervous | shy | quiet | stubborn | direct | critical | self critical | disorganized | slow | emotional) [sometimes] #h:wk_impatient",
      "@wk_pre i (can | sometimes) (be | get) [a bit | a little | too | very] (impatient | nervous | stressed | shy | quiet | stubborn | direct | critical | emotional) #h:wk_impatient",
      "@wk_pre i am too (hard on myself | critical of myself | self critical | critical to myself | critical with myself | strict with myself)",
      "@wk_pre [sometimes] i (find it hard to | can not | have trouble saying) say no #h:wk_say_no", "saying no is (hard | difficult) for me",
      "@wk_pre [sometimes] i (find it hard to | can not | do not know how to | have trouble to | am not able to) say no (to people | to anyone | to my boss | to colleagues | to my colleagues | to others)",
      "@wk_pre (public speaking | speaking in public | presentations) (is | are) (not easy | hard | difficult) for me #h:wk_public",
      "@wk_pre i am not (very | so)? good at (public speaking | speaking in public | presentations | saying no | delegating | asking for help)",
      "@wk_pre i (do not | don't) like (public speaking | speaking in public | asking for help | presentations)",
      "@wk_pre i (do not | don't) like (to delegate | delegating | to ask for help | to speak in public | to make presentations | making presentations)",
      "@wk_pre i (worry | think) too much [about (details | small things | everything)] #h:wk_worry",
      "@wk_pre i spend too much time on (details | small things | small details)", "i (sometimes | often) forget (things | names)", "i talk too much",
      "i am (always | often | sometimes | usually) late", "i am (never | not always | rarely) on time",
      // more ways to say it
      "@wk_pre [sometimes] i am [sometimes | a bit | a little | a little bit | too | very] (shy | quiet | nervous | impatient | stubborn | direct | critical | emotional | slow | disorganized) [sometimes]",
      "@wk_pre i [sometimes | often] work too (hard | much | long) and (forget to rest | do not rest | do not take breaks | forget about my family | do not sleep enough)",
      "@wk_pre [sometimes] i am [sometimes | a bit | a little | a little bit | too | very] (perfectionist | too perfectionist | forgetful | too honest | too nice | too kind | too trusting | a workaholic | too serious | too quiet | not patient enough) [sometimes]",
      "@wk_pre i (get | am | feel) [a bit | a little | very]? (nervous | stressed | anxious) (when i (speak | talk) in public | when i (speak | talk) in front of (people | a group | many people) | (before | during) presentations | in front of (people | groups | a lot of people))",
      "@wk_pre i am (bad | not very good | not good | not great | not so good | not the best) (at | with) (public speaking | speaking in public | presentations | saying no | delegating | asking for help | english | time management | managing my time | small talk)",
      "@wk_pre i (take on | take | do) too (much | many (tasks | things | projects | responsibilities)) [at (once | the same time)]",
      "@wk_pre i need (more practice | to practice [more]) [with | in] [my] english", "@wk_pre i need to (learn | improve) (more)? english",
      "@wk_pre [maybe] (my english | english | my accent | public speaking | perfectionism | impatience | time management | my shyness | my perfectionism)",
      "@wk_pre i (want | try) to do everything (perfectly | perfect | myself | alone)", "@wk_pre i do not (delegate | ask for help) [enough | very often]",
      "@wk_pre i (sometimes | often)? (forget to rest | forget to take breaks | work late | stay late at work)",
      "@wk_pre i (worry | care) too much about (details | what people think | everything | small things)",
      "@wk_pre i (do not | don't) like (to speak | speaking | talking | to talk) in front of [many | a lot of | big groups of] people",
      "@wk_pre i (get | am) (stressed | nervous) [sometimes | easily | quickly | at work]", "@wk_pre i want everything to be perfect", "@wk_pre i am (bad | not good | not very good | not so good) (with | at) (computers | technology | numbers | names | languages | english)",
      "@wk_pre i am [a bit | a little | too | very] (shy | quiet | nervous | impatient) (with (new people | strangers | people) | in (big groups | new situations) | at first)",
      "@wk_pre i (get | become) (stressed | nervous | tired | angry | upset) (easily | quickly | fast | very easily)",
      "@wk_pre i am [a bit | a little | very]? (afraid | scared) of (public speaking | speaking in public | presentations | making mistakes | big groups)",
    ] },
    working_on_it: { patterns: [
      "[but] i am (working on (it | that | this) | learning | improving | getting better | practicing) [every day] #h:wk_better",
      "[but] i am taking (english)? (classes | lessons | a course) #h:wk_classes", "[but] i (practice | study) (every day | a lot)",
      "[but] i (make | use) (lists | a to do list | to do lists | a planner | a calendar)",
      "[but] i am learning to (say no | ask for help | relax | delegate)", "[but] i (ask for help | take breaks) [more often] [now]",
      "[but] it is getting better",
      "[but] i am (trying | learning) to (improve | change | fix | work on) (it | that | this)", "[but] i (try | am trying) to (be more patient | relax | delegate | say no | ask for help | plan (my time | better) | stay calm)",
      "[but] i (study | practice | learn) english (every day | a lot | online | at home | with a teacher | in a course)", "[but] i (read | watch movies) in english (every day | a lot)",
      "[but] i am (working | trying) (hard)? to (get better | improve | be better)",
    ] },
    no_weakness: { patterns: [
      "i (do not | don't) have (any | a) weakness", "i (do not | don't) have any weaknesses", "i have no weaknesses",
      "i (can not | don't) think of (any | one | anything)",
      "i (really)? (can not | do not) (think of | find) any (weakness | weaknesses)", "i (do not | don't) (really)? have (big | real | serious | any big) weaknesses",
      "i do not think i have (any)? weaknesses",
    ] },
    no_weakness_ctx: { patterns: ["(none | nothing) [really]", "i do not know [really]", "i (do not | don't) have any"] },

    // --- five years -------------------------------------------------------------------
    future_ans: { patterns: [
      "[i see myself] (right here | here | at brightline | with this company | in this company | with you) [with you] [in a (bigger | higher | senior | leadership | management | new) (role | position)] #h:fu_here",
      "[i see myself] in a (management | leadership | senior | higher | bigger) (position | role)",
      "[still] (here | at brightline) with (more | a lot more) responsibility",
      "[i see myself | i can see myself] (leading | managing | running) (a | the | my own) team #h:fu_lead",
      "i hope (i will be | to be | to become) [a | an] (team leader | team lead | manager | supervisor | senior {job} | department head)", "i (would like | want | hope | plan) to (lead | manage) a team",
      "i (would like | want | hope | plan) to (be | become) a (team leader | team lead | manager | senior {job} | supervisor | head of department) #h:fu_become",
      "i (would like | want | hope | plan) to (grow | learn | develop) [professionally | with the company | here | a lot] #h:fu_grow",
      "(growing | learning) [and (growing | learning)] [with the company | here] [and learning something new]",
      "in a (management | leadership | senior | higher) (position | role) #h:fu_management",
      "i (would like | want | hope) to (have | take on) more responsibility", "i (hope | want | would like) to still be (here | at brightline | with the company)",
      "i (would like | want) to be an expert in {field}",
      "[maybe | probably | hopefully] [as] a (team leader | team lead | manager | supervisor | senior {job} | head of department)",
      "[in five years] i (would like | want | hope | plan) to (be | become) [a | an] (senior {job} | {job} | department head | head of (my | the | a) department | team leader | manager | supervisor | director)",
      "i hope (i will | to) still (work | be working | be) @workplace", "[i hope] still (here | at brightline | with you) [i hope]",
      "i (would like | want | hope) to be (an expert | a specialist | a professional) [in (my field | this field | my area | {field})]",
      "[i see myself] as [a | an | the] [important]? (part | member) of (your | the | this) (team | company)",
      "i (would like | want | hope) to (get | have) a promotion", "i (would like | want | hope) to (learn | grow) [a lot] and (get a promotion | grow | move up | become a manager)",
      "i (would like | want | hope) to have a (good | better | higher | senior | management | leadership) (position | role | job) [@workplace]",
      "[still] here [but] with more (experience | responsibility | skills)", "in (management | leadership | a leadership role | a management role)",
      "here [in | at | with] (your | this | the) company", "i (want | would like | hope) to (be | become) [the | a] (boss | leader | head | manager) of [the | a | my] (team | department)",
      "[i see myself] (working | still working) @workplace [with more responsibility | in a higher position]",
      "i (would like | want | hope) to (grow | develop | move up) (with | in) (this | your | the) (company | job | position | team)",
    ] },
    future_away: { patterns: [
      "(maybe | probably) (back in lithuania | in another country | somewhere else)", "i (might | may) (go back | move back) to lithuania",
      "i (do not | don't) (want | plan) to (lead a team | be a manager | manage people | be a boss)",
      "i (want | would like) to have my own (business | company)", "i (do not | don't) plan to stay (long | for long)",
      "i (want | would like | hope | plan) to (open | start | run) my own (business | company | shop | restaurant)",
      "i (do not | don't) know [yet] maybe (back in lithuania | in another country | somewhere else)", "maybe i will (go back | move back | return) to lithuania",
    ] },

    // --- teamwork ---------------------------------------------------------------------
    teamwork_ans: { patterns: [
      "[at | in] my (last | old | previous | current | first) (job | company | workplace | work) [in lithuania] [we | i] [had | worked on | did] [a | an] [big | large | new | difficult | important | huge] [project]",
      "we (had | finished | did | completed | delivered | organized | planned | launched | built | made | prepared) a (big | large | new | difficult | important | huge)? (project | event | order | report | presentation | conference | website | system) [together] [on time] [in {dur}] #h:tw_project",
      "we (worked | always worked) (together | as a team) [on a [big] project] [every day] #h:tw_together",
      "i (worked | work) (with | in | on) a team of {number} [people] #h:tw_team_of",
      "i (helped | trained | supported) (a | my | our) [new] (colleague | coworker | co worker | team member | teammate | colleagues | team) #h:tw_helped",
      "we (help | helped) each other [a lot | every day] #h:tw_each_other", "we (shared | split) the work",
      "i (organized | planned | led | coordinated) (the | a | our) (project | team | meeting | work | event)",
      "everyone (helped | did their part)", "(it | the project) was a [big | great] success", "we finished (it | on time | early)",
      "i [always | usually | often] work (in | with | on) a team [every day | a lot]", "i was (a | the) (team leader | leader | manager | supervisor | head) [of (a | the | my) team]",
      "(in | at) my (team | job | company | department) we [always]? (help | helped) each other [a lot | every day]",
      "we (work | worked | always work) as a team [every day | at (the | my) (hospital | school | factory | office | restaurant | company)]",
      "(at | in) (the | my | our) (hospital | school | factory | office | restaurant | company | warehouse) we (work | worked | always work) (as a team | together) [every day]",
      "i (led | managed | was the leader of) a team of {number} [people]", "i (trained | taught | helped) new (people | colleagues | workers | employees) [in my team]",
      "(me and my | my) (colleagues | team | coworkers) (finished | did | completed | delivered | made) a (big | large | difficult | huge)? (project | order | job) [on time | before the deadline | together]",
      "we (shared | split | divided) the (tasks | work | job) [and (helped | supported) each other]",
      "our team (was | had) {number} people [and we (made | built | finished | did) a (new)? (website | project | system | event)]",
    ] },
    story_ctx: { patterns: ["{s:story}"] },
    no_team: { patterns: ["i (usually | mostly | always) work alone", "i (have never | never) worked (in | on | with) a team", "i (do not | don't) have (an | any) example"] },
    example_q: { patterns: ["(can | could) you give me an example", "(what | which) (kind of )?example", "like what"] },

    // --- languages ----------------------------------------------------------------------
    languages_ans: { patterns: [
      "i speak {language} [{language}] [and {language}] [and a little {language}] #h:l_speak",
      "my (native | first | mother) (language | tongue) is {language} #h:l_native",
      "i [also] speak (a little | a bit of | some | basic) {language} #h:l_little",
      "i speak {number} languages", "[only] {language} and english",
      "i (know | can speak | understand | can understand | also know) [a little | a bit of | some]? {language} [{language}] [and [a little | a bit of | some]? {language}]",
      "{language} is my (native | first | mother) (language | tongue)", "i am fluent in {language} [and {language}]",
      "i speak (fluent | good | very good | perfect) {language} [and [a little | some]? {language}]",
      "{number} languages {language} [{language}] [and {language}] [and {language}]",
      "{language} (very well | fluently | perfectly | a little | a bit) [and {language} (very well | fluently | a little | a bit)]",
    ] },
    languages_ctx: { patterns: [
      "{language} [{language}] [and {language}] [and {language}]",
      "{language} [{language}] [{language}] and (a little | a bit of | some | basic) {language}",
      "{language} [{language}] and {language} of course", "of course {language} [{language}] [and {language}]",
    ] },

    // --- work authorization -----------------------------------------------------------------
    auth_yes: { patterns: [
      "[yes] i have [a | my] green card #h:a_green", "[yes] i have [a | my] (work permit | work visa | visa | employment authorization) #h:a_permit",
      "[yes] i am (a (us | u s | american) citizen | an american citizen | a citizen | a permanent resident | authorized)",
      "[yes] i can work (here | in the (us | states | united states))",
      "[yes] i have (all | all the | all my | the)? (necessary | right | needed)? (documents | papers)",
      "[yes] i have (the)? right to work (here | in the (us | u s | states | united states) | in america)",
      "[yes] i have [the] (permission | a permit | the right) to work [here | in the (us | u s | states | united states)]",
      "[yes] i am (allowed | legally allowed | able) to work (here | in the (us | u s | states | united states) | in america | legally)",
      "[yes] i am (a legal resident | a legal permanent resident | legal | here legally | a resident)", "[yes] i am (a (us | u s | american) citizen | an american citizen) [now]",
      "[yes] i (got | have got | already have) [a | my] (green card | work permit | work visa | social security number)", "[yes] everything is (legal | in order | okay) [with my documents]",
    ] },
    auth_pending: { patterns: [
      "[no] not yet [but] [i am waiting for (it | my (work permit | green card | visa))] #h:a_waiting",
      "i am waiting for my (work permit | green card | visa | papers | documents)",
      "my (work permit | green card | visa) is (on the way | in process | coming | being processed)",
      "i (will | should) (have | get) (it | my (work permit | green card | visa)) (soon | next month | in {dur})",
      "[no] i (do not | don't) have (a green card | a work permit | a work visa | a visa | my papers) [yet]",
      "[not yet] my (papers | documents | application | work permit | green card | visa) (are | is) (in process | being processed | on the way | in progress | coming soon)",
      "i (applied | have applied | already applied) for [a | my] (work permit | green card | visa | work visa)",
      "i (will | should | am going to) (have | get | receive) [it | them | my @auth_papers] (soon | next month | next week | in {dur} | in a few (weeks | months))",
      "[not yet] i am still waiting for [my] @auth_papers", "[not yet] (soon | very soon) [i hope]",
    ] },

    // --- salary -------------------------------------------------------------------------
    salary_ans: { patterns: [
      "@sal_pre [something | somewhere] [like | around | about | in the range of] @money #h:s_amount",
      "@sal_pre [something | somewhere] between @money and @money #h:s_range", "@sal_pre [from] @money to @money",
      "@money (would be | is) (fine | great | good | okay | enough)", "i (was | am) making @money [(at | in) my last job | before]",
      "@money (would be | is) (fair | good for me | okay for me | enough for me)", "i (was | am) (making | earning | getting) @money [(at | in) my (last | old | previous | current) job | before | now]",
      "(minimum | at least) @money", "not less than @money",
    ] },
    salary_flexible: { patterns: [
      "i am (flexible | open) [on that | about that | to (discussion | negotiation)] #h:s_flexible",
      "(it | that) depends on the (job | position | responsibilities | benefits)", "(we can | i am happy to) (talk | discuss) (about it | it | that) [later]",
      "i would like to (know | learn) more about the (job | position | role) first", "whatever is fair", "the (market | standard | usual) rate",
      "(it is | that is | the salary is | salary is) (negotiable | open for discussion | open to discussion)", "i am open to (your | an) (offer | proposal)",
      "(what | whatever) you (offer | think is fair)", "i am (flexible | open) [it depends on the (benefits | job | position | responsibilities)]",
      "(it | that) depends [on the (benefits | job | position | responsibilities | hours)]", "a (normal | fair | standard | good) salary for this (job | position)",
    ] },
    salary_more: { patterns: ["i was (hoping | looking) for [a little | a bit | something] more #h:range_more", "[maybe] a (little | bit) more"] },
    salary_range_q: { patterns: [
      "what is the [salary | pay] range [for (this | the) (position | job | role)] #h:s_range_q", "what (does | would) (the | this) (job | position | role) pay",
      "how much (does | would) (the | this) (job | position | role) pay", "what is the (salary | pay) [for (this | the) (position | job)]",
      "what (salary | pay) (do you offer | are you offering)", "how much is the (salary | pay)",
      "what (do you | can you | would you) offer", "how much (do | would | can) you pay", "what is (normal | usual | standard | typical) for (this | the) (job | position)",
      "(how much | what) (can | could | would) i (earn | make | get) [here | in this (job | position)]", "what is the salary",
      "i would like to (know | hear) the [salary] (range | salary | pay) [first] [for (this | the) (position | job)]", "(can | could) you tell me the [salary] (range | salary) [first]",
    ] },

    // --- start date -------------------------------------------------------------------------
    start_ans: { patterns: [
      "[i can start] (right away | immediately | as soon as possible | asap | any time | anytime | tomorrow | today) #h:st_asap",
      "[i can start] [on] {day} #h:st_monday",
      "[i can start] in {dur} after i (give | have given) [my] notice #notice", "[i can start] (from | in | at the beginning of | at the start of | in early) (january | february | march | april | may | june | july | august | september | october | november | december)",
      "[i can start] (next week | next month | in {dur} | in a (week | month) | on {date} | on the (first | 1st) [of (next | the) month] | at the (beginning | start) of (next | the) month | from {date} | from {day}) #h:st_weeks",
      "i (need | have) to give [my (employer | boss | company)] (two weeks | 2 weeks | a months | one months | a month s) notice [first] #notice #h:st_notice",
      "i am available (right away | immediately | now | from {day} | from {date} | next week | next month | any time)",
      "(whenever | when ever | when) you (need me | want | like | need)", "(from | on) {day} [i can [start]]",
      "i can not start (before | until) (next month | {date} | {day} | the (first | 1st) [of (next | the) month]) #later",
      "not (before | until) (next month | {date} | {day})",
      "i can not start (next {day} | next week | {day} | tomorrow | right away | so soon | this week) #cant", "not (next week | next {day} | {day} | tomorrow | this week | right away) #cant",
      "[i can start] [on | from] [the] (first | 1st | beginning | start) of (next | the next | the) month #h:st_weeks", "[i can start] after {dur}",
      "[i can start] (tomorrow | next week | next month | on {day} | {day} | right away | immediately | today) (if (you want | you like | you need me | that is okay | that works [for you]))",
      "[i can start] (whenever | any time | anytime) you (want | need me | like | need)",
      "i (need | have) {dur} to (finish | leave) (my | at my) [current | old | last | other] job #notice",
      "i (need | have) to give (notice | my notice) [to my (boss | employer | company)] [first] [so] [in {dur} | after {dur}] #notice",
      "(any time | anytime | whenever) you (want | need | like) [me to]", "as soon as (you want | you need me | you need | you like)",
      "i am ready to start [right now | right away | now | immediately | tomorrow | on {day} | next week | any time]",
      "i am (free | available) (from {day} | from next (week | month) | next week | from {date} | now)",
      "{day} is (good | fine | okay) [for me]", "[i can start] on {date}",
      "i can (come | begin | start work | start working | come to work) [on]? (tomorrow | next week | next month | on {day} | {day} | right away | immediately | in {dur})",
    ] },

    // --- why hire you -------------------------------------------------------------------------
    hire_ans: { patterns: [
      "[because] i have the [right] (experience | skills | experience and skills) [you need | for (this | the) (job | position)] #h:h_experience",
      "[because] i am the right person (for (this | the) (job | position) | for you) #h:h_right",
      "[because] i [really] want (this | the) job [and i will work hard]", "give me a chance and you will see #h:h_chance",
      "[because] i (will | am going to) (do my best | work hard | learn fast)", "[because] i am (ready | motivated) [to (learn | work | start)]",
      "[because] i (can | will) (help | bring value to | add value to) (your | the) (team | company)",
      "[because] i am the (best | right | perfect | ideal) (candidate | person) (for (this | the) (job | position | role) | for you | for your company)",
      "[because] i (will | am going to) (do my best | work hard | learn fast | give my best) (for (you | your company | the company | the team) | here)",
      "you (will not | won't) regret (it | this | hiring me)", "you will be (happy | glad) with me",
      "i (can | will) (bring | offer | give) (a lot | much | many things | value | new ideas | my experience | energy) (to | for) (your | the) (team | company)",
      "[because] i have (exactly)? the (right)? (experience | skills | experience and skills) (you need | you are looking for | for this (job | position))",
      "[because] i have the [right] (skills and experience | skills and the experience | knowledge and experience) [you need | you are looking for | for (this | the) (job | position)]",
      "[because] i am [very | really] (motivated | ready | eager | willing) [and (ready | eager | willing | motivated)] [to (learn | work | start | grow)]",
      "[because] i am (perfect | a (good | great | perfect) fit | the right fit) for (this | the) (job | position | role | team | company)",
      "[because] i (really)? (love | like | enjoy) (this | my | this kind of | the) (work | job)", "[because] i can do (this | the) job [very | really] well",
      "i (will | would | can) be a (great | good | valuable | strong | useful) (addition | asset | member) (to | for | of) (your | the | this) (team | company)",
      "my (greatest | biggest | main | best | strongest) (strength | advantage | asset) is my (experience | work experience | knowledge | skills | education)",
      "[because] i have (a lot of | lots of | many years of | the right) experience [in {field} | in this field]",
      "[because] i have {dur} of [work] experience [in {field} | in (this | the) field | as [a | an] {job}]", "i am sure i can do (this | the) job [very | really]? well",
      "[because] i have (experience | a lot of experience | good experience | the experience) in (this | the | my) (area | field | industry | job | work)",
      "[because] i am the best [candidate | person | worker] [for (this | the) (job | position)]", "i [really] want to work [here | for you | in your company | with you]",
      "[because] i know (this | the) (job | work | field | industry | business) [very | really] well", "you (will not | won't) be disappointed",
      "give me a chance [and] you (will not | won't) (be disappointed | regret it)",
    ] },

    // --- the learner's questions -------------------------------------------------------------------
    can_ask: { patterns: ["(can | could | may) i ask [you] (a question | something | a few questions)", "[yes] i have (a | one | a few | two | some | a couple of) (question | questions)", "yes actually i do"] },
    q_hours: { patterns: [
      "what are the (working | work | office) hours #h:q_hours", "what (are | will be | would be) my (working | work)? hours",
      "what time (does (work | the day | the workday) | do (i | we | you)) (start | begin | finish | end)",
      "(is it | are the hours) (nine to five | 9 to 5 | full time | part time)", "how many hours (a | per) (week | day)",
      "what is the (schedule | work schedule)", "is (it | the job) full time",
      "(do | will) i (need to | have to) work (on weekends | at weekends | on saturdays | overtime | at night | nights | in shifts | late)", "is there (any)? overtime",
      "how long is the (lunch break | lunch | break)", "how many hours (do | will | would) (i | we) work [a (day | week) | per (day | week)]", "is there a (lunch break | break)", "what time (i | we) (start | begin | finish) [work]", "is (it | the job | this) (a)? (full time | part time) (job | position)", "how many hours will i work [a (day | week)]",
      "what (are | is) the (working | work)? (hours | schedule) (like)?", "(when | what time) (do | does) (the)? (work | day) (start | begin | finish | end)",
    ] },
    q_training: { patterns: [
      "(is there | will there be | do you (offer | provide) | will i (get | have)) (any)? training #h:q_training",
      "(is there | will there be | do you (offer | provide) | will i (get | have)) (any)? training for (new people | new employees | me | beginners | new workers | newcomers)",
      "(who | will someone) (will)? (train | show) me", "is there a mentor", "how (will | do) i learn the job",
      "(will | is) (someone | somebody | anyone) (going to)? (train | help | teach | show) me", "will i (have | get) (a | any)? (training | mentor | course)",
      "do (i | new people) get (any)? training",
    ] },
    q_start: { patterns: ["when would i start #h:q_start", "when (could | can | do) i start", "what is the start date", "when is the start date", "when (is | would be) (the | my) first (day | day of work | working day)"] },
    q_team: { patterns: [
      "how (big | large) is the team #h:q_team", "how many people (are | work) (on | in) the team", "who (would | will) i (work with | be working with)",
      "who would be my (boss | manager | supervisor)", "tell me about the team",
      "who (is | will be) my (boss | manager | supervisor | team leader)", "how many people work (here | in the office | in the company | at brightline)", "how many people work (in | on) (the | my | your) team",
    ] },
    q_remote: { patterns: [
      "(can | could) i (work | sometimes work) (from home | remotely) #h:q_remote", "(can | could) i work (from home | remotely) (sometimes | some days | on fridays | part of the week)", "(can | could) i work (at home | from my home) [sometimes]", "is (remote work | working from home | hybrid work) possible",
      "is (the job | it | the position) (remote | hybrid)", "do you (allow | offer) (remote work | working from home | hybrid work)",
      "is it possible to work (from home | remotely) [sometimes]", "(can | could) i sometimes work (from home | remotely)", "(do | can) people work from home [here]",
    ] },
    q_benefits: { patterns: [
      "what are the benefits #h:q_benefits", "what (benefits | kind of benefits) do you (offer | have)",
      "is there (health | medical | dental) insurance", "(do you offer | is there) (health | medical) insurance",
      "how many (vacation | paid vacation) days (do i get | are there | would i get)", "how much (vacation | paid time off | pto) (do i get | is there | would i get)",
      "how many (holiday days | days of holiday | holidays) (do i get | are there | would i get) #tip:us_vacation",
      "how much holiday (do i get | is there | would i get) #tip:us_vacation", "how (much | many) (vacation | vacation days | days off | paid days off)",
    ] },
    q_day: { patterns: [
      "what does a typical day look like #h:q_day", "what (would | will) i be doing", "what (are | would be | will be) my (main)? (duties | responsibilities | tasks)",
      "what is a (typical | normal | usual) day like", "what does the job involve",
      "what (will | would) i do [every day | here | at work | in this job]", "what will my (job | work | role | tasks) be", "what (exactly)? (will | would) be my (job | work | role)",
    ] },
    q_next: { patterns: [
      "what are the next steps #h:q_next", "what is the next step", "when (will | can | could) i hear (from you | back)",
      "when (will you | do you) (make a decision | decide | let me know)", "when (will | do) (i | we) know",
      "when (will | do | can) i (know | get | hear) [your | the] (decision | answer | results)", "when (will | would) you (call | contact | email) me",
      "what (happens | is) next", "when will i (know | hear) (something | anything)", "when (you | will you) (call | contact | email) me",
    ] },
    q_dress: { patterns: ["(is there | do you have) a dress code #h:q_dress", "what (should | do) i wear [to work]", "what is the dress code"] },
    q_parking: { patterns: ["(is there | do you have) parking", "where can i park", "is parking (free | included)", "(is there | do you have | can i get) [a] [free] (parking | parking lot | parking space | place to park | parking garage | parking spot | parking place)", "can i park (here | near the office | at the office)"] },
    q_like: { patterns: ["what do you like [most] about working here", "what do you like about (the company | brightline | this company)", "do you like working here"] },
    q_restroom: { patterns: ["where is the (restroom | bathroom | ladies room | mens room)", "where is the toilet #tip:us_restroom", "(can | could | may) i use the (restroom | bathroom)"] },
    her_name: { patterns: ["[sorry | and] what is your name [again | sorry]", "who are you", "and you are", "are you the (hr manager | manager | boss)"] },
    q_other_ctx: { patterns: ["(what | how | when | where | who | why | is there | do you | can i | will i | are there) {w:any}"] },
    no_questions: { patterns: [
      "[no] [i think] you (answered | have answered | covered | have covered | explained) everything #h:q_none",
      "[no] (that is | i think that is) (all | it | everything) [for now]", "[no] no [more | other] questions [for now | right now]",
      "[no] i do not have any (more | other)? questions [right now | for now]", "[no] (i am | i think i am) good", "[no] nothing [else] [for now]",
      "[no] i think i know everything [i need]",
      "[no] everything is (clear | fine | okay) [now]", "[no] [i think] you (answered | have answered) (all my | my | all of my) questions",
      "[no] i (do not | don't) have (any)? questions [right now | for now]", "[no] [i think] (that is | it is) (clear | all clear)",
      "[no] i have no [more | other | further] questions [for now | right now | thank you]",
    ] },

    // --- closing --------------------------------------------------------------------------------
    thanks_time: { patterns: [
      "thank you [very much | so much] for your time [today] #h:c_thanks_time", "thanks [so much | a lot] for your time [today]", "(thanks | thank you) [so much | very much | a lot] for (this | the) (opportunity | interview | meeting)",
      "thank you [very much | so much] for (the opportunity | this opportunity | meeting me | seeing me | having me | the interview | inviting me) #h:c_opportunity",
      "i appreciate (your time | it | the opportunity)",
    ] },
    look_forward: { patterns: [
      "i look forward to hearing from you #h:c_look_forward", "i am looking forward to hearing from you", "i hope to hear from you [soon]",
      "i look forward to (it | your call | your email)",
      "i will wait for (your | the)? (call | answer | email | news | decision)", "i (hope | will be happy) to hear from you [soon]", "i am waiting for your (call | answer | email)",
    ] },
    nice_meet: { patterns: [
      "(it was | it has been) (nice | great | a pleasure | lovely) (to meet | meeting | talking to | talking with) you #h:c_nice_meet",
      "nice (to meet | meeting) you [too]", "pleasure (to meet | meeting) you",
    ] },

    // --- the job offer (twist) ------------------------------------------------------------------
    accept_job: { patterns: [
      "[thank you [so much | very much]] [yes] i accept #h:o_accept", "[yes] i (would | will) (love to | be happy to | gladly) (accept | take it | join)",
      "(that is | this is | what) (wonderful | great | amazing | fantastic) [news] #h:o_wonderful", "really", "[yes] of course i accept",
      "i will take it", "when do i start",
      "i am (very | so | really)? (happy | glad | excited | thrilled) [to (accept | join | hear that | hear this | join the team)]",
      "[yes] i (would | will) be (happy | glad) to (join | accept | work here | join your team | join the team)", "[yes] i (want | would like) (the job | to work here)",
      "(wow)? (thank you | thanks) [so much | very much] [yes]", "i (can not | cannot) believe it",
    ] },
    think_offer: { patterns: [
      "(can | could | may) i think about it #h:o_think", "i (need | would like) (some time | a day | a few days) to think [about it]",
      "(can | could) i let you know (tomorrow | later | on {day})",
      "i (need | have | would like) to (talk | speak) (to | with) my (family | wife | husband | partner) [first]",
      "(can | could | may) i think about it (until | till) (tomorrow | {day} | next week)", "i (need | want) to think about it [first]",
      "[but] i need (some | a little | more)? time [to think] [about it]",
    ] },
    decline_offer: { patterns: [
      "[no] i (can not | do not want to) accept [it]", "i am (sorry | afraid) i (can not | have to) (accept | decline) [it]",
      "i have (another | a better) offer", "i (decided | have decided) to take another job",
    ] },

    // --- side moves --------------------------------------------------------------------------------
    nervous: { patterns: ["[sorry] i am [a little | a bit | really | very | so] (nervous | stressed | anxious) #h:x_nervous"] },
    resume: { patterns: [
      "here is my (resume | cv #tip:us_resume) #h:x_resume", "i brought (my | a copy of my) (resume | cv #tip:us_resume)",
      "(do you need | would you like) (my | a copy of my) (resume | cv #tip:us_resume)",
    ] },
    no_problem: { patterns: [
      "no problem [at all]", "no worries", "take your time", "(that is | it is) (okay | fine | all right)", "do not worry [about it]",
      "[of course | sure] go ahead", "[sure | of course | no problem] i (can | will) wait", "(it is | that is) no problem",
    ] },
  },

  lines: {
    // --- arriving -----------------------------------------------------------------------
    greet_help: [
      t("Good | morning! | Can | I | help | you?", "Labas | rytas! | Ar galiu | aš | padėti | jums?", "Labas rytas! Kuo galiu padėti?"),
      t("Hi there! | How | can | I | help | you?", "Sveiki! | Kuo | galiu | aš | padėti | jums?", "Sveiki! Kuo galiu padėti?"),
    ],
    greet_interview: [
      t("Good | morning! | Are | you | here | for | the | interview?", "Labas | rytas! | Ar | jūs | čia | dėl | — | darbo pokalbio?", "Labas rytas! Jūs atvykote į darbo pokalbį?",
        { flags: { 2: F_ARE_Q } }),
      t("Hi! | You | must | be | here | for | the | 9:30 | interview.", "Sveiki! | Jūs | turbūt | esate | čia | dėl | — | 9:30 | darbo pokalbio.",
        "Sveiki! Jūs turbūt atvykote į 9:30 darbo pokalbį.", { say: "Hi! You must be here for the nine thirty interview." }),
    ],
    purpose_again: [
      t("Are | you | here | for | an | interview?", "Ar | jūs | čia | dėl | — | darbo pokalbio?", "Ar jūs atvykote į darbo pokalbį?", { flags: { 0: F_ARE_Q } }),
    ],
    how_help: [t("Oh, | sorry! | How | can | I | help | you?", "O, | atsiprašau! | Kuo | galiu | aš | padėti | jums?", "O, atsiprašau! Kuo galiu padėti?")],
    early_ok: [t("No | problem | at all!", "Jokių | problemų | visai!", "Nieko tokio!"), t("That's | fine!", "Tai | gerai!", "Nieko tokio!")],
    thats_me: [t("Yes, | that's | me!", "Taip, | tai | aš!", "Taip, tai aš!", { flags: { 1: F_THATS } })],
    other_time: [
      t("I | have | you | down | for | 9:30, | but | that's | no | problem.", "Aš | turiu | jus | užrašytą | — | 9:30, | bet | tai | ne | problema.",
        "Pas mane jūs {m:užrašytas|f:užrašyta} 9:30, bet tai ne problema.",
        { say: "I have you down for nine thirty, but that's no problem.", flags: { 3: "“down” (have … down): užrašytą = written down.", 4: "“for” (a time): Lithuanian uses the time alone.", 7: F_THATS } }),
    ],
    ask_name: [
      t("Great! | And | your | name, | please?", "Puiku! | O | jūsų | vardas, | prašau?", "Puiku! O kaip jūsų vardas?"),
      t("Wonderful. | And | you | are...?", "Puiku. | O | jūs | esate...?", "Puiku. O jūs esate…?"),
    ],
    name_again: [t("Sorry, | what | was | your | name?", "Atsiprašau, | koks | buvo | jūsų | vardas?", "Atsiprašau, koks jūsų vardas?")],
    welcome: [
      t("Nice | to meet | you! | I'm | the | HR | manager | here.", "Malonu | susipažinti | su jumis! | Aš esu | — | personalo | vadovė | čia.", "Malonu susipažinti! Aš čia personalo vadovė."),
      t("Nice | to meet | you! | Thank | you | for | coming in.", "Malonu | susipažinti | su jumis! | Dėkoju | jums, | kad | atvykote.", "Malonu susipažinti! Ačiū, kad atvykote."),
    ],
    sit: [
      t("Please, | have a seat.", "Prašom, | prisėskite.", "Prašom, prisėskite."),
      t("Come | in | and | have a seat.", "Užeikite | — | ir | prisėskite.", "Užeikite ir prisėskite.", { flags: { 1: "“in” (come in): the prefix už- of užeikite carries it." } }),
    ],

    // --- small talk ----------------------------------------------------------------------------
    ask_found: [
      t("Did | you | find | us | okay?", "Ar | jūs | radote | mus | lengvai?", "Ar lengvai mus radote?", { flags: { 0: "Question “Did” = the particle ar; the past tense sits on radote." } }),
      t("Was | it | easy | to find | us?", "Ar buvo | — | lengva | rasti | mus?", "Ar buvo lengva mus rasti?", { flags: { 1: "Dummy “it” has no Lithuanian word (C-DUMMY)." } }),
    ],
    found_good: [t("Good!", "Puiku!", "Puiku!"), t("Great.", "Puiku.", "Puiku.")],
    found_bad: [t("Oh | no! | Well, | you're | here | now.", "O | ne! | Na, | jūs esate | čia | dabar.", "O ne! Na, dabar jūs čia.")],
    offer_drink: [
      t("Can | I | get | you | anything? | Water? | Coffee?", "Ar galiu | aš | pasiūlyti | jums | ko nors? | Vandens? | Kavos?", "Gal ko nors norėtumėte? Vandens? Kavos?"),
      t("Would | you | like | some | water | or | coffee?", "Ar | jūs | norėtumėte | — | vandens | ar | kavos?", "Ar norėtumėte vandens ar kavos?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte.", 3: "Partitive “some”: the genitive vandens carries it." } }),
    ],
    here_water: [t("Here you go.", "Prašom.", "Prašom."), t("Sure, | here you go.", "Žinoma, | prašom.", "Žinoma, prašom.")],
    here_coffee: [t("Sure! | Here's | your | coffee.", "Žinoma! | Štai | jūsų | kava.", "Žinoma! Štai jūsų kava.")],
    no_drink_ok: [t("Okay, | sure.", "Gerai, | žinoma.", "Gerai.")],

    // --- about you --------------------------------------------------------------------------------
    ask_about: [
      t("So, | tell | me | a little | about | yourself.", "Taigi, | papasakokite | man | truputį | apie | save.", "Taigi, papasakokite truputį apie save."),
      t("So, | tell | me | about | yourself.", "Taigi, | papasakokite | man | apie | save.", "Taigi, papasakokite apie save."),
      t("First, | could | you | tell | me | a little | about | yourself?", "Pirmiausia, | ar galėtumėte | jūs | papasakoti | man | truputį | apie | save?",
        "Pirmiausia, gal galėtumėte truputį papasakoti apie save?"),
    ],
    ask_about_again: [
      t("So, | tell | me | a little | about | yourself.", "Taigi, | papasakokite | man | truputį | apie | save.", "Taigi, papasakokite truputį apie save."),
      t("Just | tell | me | a little | about | yourself: | your | work | and | your | experience.", "Tiesiog | papasakokite | man | truputį | apie | save: | jūsų | darbą | ir | jūsų | patirtį.",
        "Tiesiog truputį papasakokite apie save: apie savo darbą ir patirtį."),
    ],
    ask_job_more: [
      t("And | what | do | you | do?", "O | kuo | — | jūs | dirbate?", "O kuo jūs dirbate?", { flags: { 2: F_WH_DO } }),
      t("So, | what | do | you | do | now?", "Tai | kuo | — | jūs | dirbate | dabar?", "Tai kuo dabar dirbate?", { flags: { 2: F_WH_DO } }),
    ],
    not_job_ack: [t("Oh, | I | see.", "O, | aš | suprantu.", "O, suprantu.")],
    why_neg_ack: [t("Okay, | thanks | for | being | honest.", "Gerai, | ačiū, | kad | esate | {m:atviras|f:atvira}.", "Gerai, ačiū už atvirumą.")],
    ask_start_when: [t("No | problem. | When | could | you | start, | then?", "Jokių | problemų. | Kada | galėtumėte | jūs | pradėti, | tada?", "Jokių problemų. Tai kada galėtumėte pradėti?")],
    a_restroom: [t("It's | down the hall, | on the left.", "Jis yra | koridoriaus gale, | kairėje.", "Koridoriaus gale, kairėje.")],
    brooks_name: [t("I'm | Ms. | Brooks, | the | HR | manager.", "Aš esu | ponia | Bruks, | — | personalo | vadovė.", "Aš ponia Bruks, personalo vadovė.")],
    ask_studied: [t("And | what | did | you | study?", "O | ką | — | jūs | studijavote?", "O ką studijavote?", { flags: { 2: F_WH_DID } })],
    ask_job_before: [t("And | what | did | you | do | before?", "O | kuo | — | jūs | dirbote | anksčiau?", "O kuo dirbote anksčiau?", { flags: { 2: F_WH_DID } })],
    ask_years_job: [
      t("How long | have | you | worked | as | {X.np}?", "Kiek laiko | — | jūs | dirbate | — | {X.np:ins}?", "Kiek laiko dirbate {X:ins}?", { flags: { 1: F_HAVE, 4: F_AS } }),
      t("And | how long | have | you | been | {X.np}?", "O | kiek laiko | — | jūs | esate | {X.np:nom}?", "O kiek laiko esate {X:nom}?", { flags: { 2: F_HAVE } }),
    ],
    ask_years_field: [
      t("And | how long | have | you | worked | in {X}?", "O | kiek laiko | — | jūs | dirbate | {X:loc}?", "O kiek laiko dirbate {X:loc}?", { flags: { 2: F_HAVE } }),
    ],
    ask_years_field2: [
      t("And | how long | have | you | worked | in | {X}?", "O | kiek laiko | — | jūs | dirbate | — | {X:loc}?", "O kiek laiko dirbate {X:loc}?", { flags: { 2: F_HAVE, 5: F_IN } }),
    ],
    ask_years_generic: [
      t("And | how many | years | of | experience | do | you | have?", "O | kiek | metų | — | patirties | — | jūs | turite?", "O kiek metų patirties turite?",
        { flags: { 3: "“of”: the genitive patirties carries it.", 5: F_WH_DO } }),
    ],
    job_echo: [
      t("Oh, | {X.np}! | Interesting.", "O, | {X.np:nom}! | Įdomu.", "O, {X:nom}! Įdomu."),
      t("Oh, | {X.np}! | That's | great.", "O, | {X.np:nom}! | Tai | puiku.", "O, {X:nom}! Puiku."),
    ],
    about_ack: [t("Interesting.", "Įdomu.", "Įdomu."), t("Great.", "Puiku.", "Puiku."), t("Okay, | great.", "Gerai, | puiku.", "Gerai, puiku.")],
    exp_lot: [
      t("Wow, | that's | a | lot | of experience!", "Oho, | tai yra | — | daug | patirties!", "Oho, tai daug patirties!"),
      t("That's | a | lot | of experience!", "Tai yra | — | daug | patirties!", "Tai daug patirties!"),
    ],
    exp_good: [t("That's | great | experience.", "Tai yra | puiki | patirtis.", "Tai puiki patirtis."), t("Great.", "Puiku.", "Puiku.")],
    no_exp_ok: [
      t("That's | okay. | We | offer | training | for | new | people.", "Tai | gerai. | Mes | siūlome | mokymus | — | naujiems | žmonėms.",
        "Nieko tokio. Naujiems žmonėms siūlome mokymus.", { flags: { 5: "“for”: the dative naujiems žmonėms carries it." } }),
    ],
    from_lt: [t("Oh, | Lithuania! | Welcome!", "O, | Lietuva! | Sveiki atvykę!", "O, Lietuva! Sveiki atvykę!")],
    nice: [t("Oh, | nice!", "O, | puiku!", "O, puiku!"), t("Oh, | that's | nice.", "O, | tai | malonu.", "O, kaip smagu.")],
    moved_ack: [t("Oh, | welcome!", "O, | sveiki atvykę!", "O, sveiki atvykę!")],
    english_good: [t("Your | English | is | very | good!", "Jūsų | anglų kalba | yra | labai | gera!", "Jūs labai gerai kalbate angliškai!")],
    what_know_help: [
      t("Just | the | basics: | what | you | do | and | your | experience.", "Tik | — | svarbiausią: | ką | jūs | dirbate | ir | jūsų | patirtį.",
        "Tik svarbiausią: kuo dirbate ir kokia jūsų patirtis."),
    ],

    // --- why a new job ------------------------------------------------------------------------------
    ask_leaving: [
      t("So, | why | are | you | looking for | a | new | job?", "Taigi, | kodėl | — | jūs | ieškote | — | naujo | darbo?", "Taigi, kodėl ieškote naujo darbo?", { flags: { 2: F_PROG } }),
      t("Why | did | you | leave | your | last | job?", "Kodėl | — | jūs | išėjote iš | savo | ankstesnio | darbo?", "Kodėl išėjote iš ankstesnio darbo?", { flags: { 1: F_WH_DID } }),
    ],
    leaving_ack: [t("I | see.", "Aš | suprantu.", "Suprantu."), t("That | makes sense.", "Tai | suprantama.", "Suprantama.")],

    // --- why here --------------------------------------------------------------------------------------
    ask_why: [
      t("So, | why | do | you | want | to work | here?", "Taigi, | kodėl | — | jūs | norite | dirbti | čia?", "Taigi, kodėl norite čia dirbti?", { flags: { 2: F_WH_DO } }),
      t("Why | do | you | want | to work | at Brightline?", "Kodėl | — | jūs | norite | dirbti | „Brightline“?", "Kodėl norite dirbti „Brightline“?", { flags: { 1: F_WH_DO } }),
    ],
    why_ack: [
      t("That's | great | to hear.", "Tai | puiku | girdėti.", "Malonu girdėti."),
      t("I | appreciate | that.", "Aš | vertinu | tai.", "Labai tai vertinu."),
      t("I'm | glad | to hear | that.", "Man | malonu | girdėti | tai.", "Malonu tai girdėti."),
    ],

    // --- strengths ------------------------------------------------------------------------------------
    ask_strengths: [
      t("What | are | your | greatest | strengths?", "Kokios | yra | jūsų | didžiausios | stiprybės?", "Kokios jūsų didžiausios stiprybės?"),
      t("So, | what | are | your | strengths?", "Taigi, | kokios | yra | jūsų | stiprybės?", "Taigi, kokios jūsų stiprybės?"),
    ],
    strength_ack: [
      t("That's | really | important | here.", "Tai | labai | svarbu | čia.", "Čia tai labai svarbu."),
      t("Those | are | great | qualities.", "Tai | yra | puikios | savybės.", "Tai puikios savybės."),
      t("Great.", "Puiku.", "Puiku."),
    ],
    s_team: [t("Good, | because | we | work | in teams | a | lot | here.", "Gerai, | nes | mes | dirbame | komandose | — | daug | čia.", "Gerai, nes čia daug dirbame komandose.")],
    s_fast: [t("Good! | There's | a | lot | to learn | here.", "Gerai! | Yra | — | daug | ko išmokti | čia.", "Gerai! Čia yra daug ko išmokti.")],
    s_people: [t("That's | important. | You'll work | with | a | lot | of clients.", "Tai | svarbu. | Jūs dirbsite | su | — | daugeliu | klientų.", "Tai svarbu. Dirbsite su daugeliu klientų.")],
    s_organized: [t("We | love | organized | people | here!", "Mes | labai mėgstame | organizuotus | žmones | čia!", "Čia labai mėgstame organizuotus žmones!")],
    strength_help: [
      t("For example: | are | you | organized? | Good | with | people?", "Pavyzdžiui: | ar | jūs | {m:organizuotas|f:organizuota}? | {m:Geras|f:Gera} | su | žmonėmis?",
        "Pavyzdžiui: ar jūs {m:organizuotas|f:organizuota}? Mokate bendrauti su žmonėmis?", { flags: { 1: F_ARE_Q } }),
    ],
    not_strength_ack: [t("Okay. | And | what | are | you | good | at?", "Gerai. | O | kuo | esate | jūs | {m:stiprus|f:stipri} | [kuo]?", "Gerai. O kuo jūs {m:stiprus|f:stipri}?",
      { flags: { 6: "Stranded “at”: kuo (at the start) carries it." } })],

    // --- weaknesses ----------------------------------------------------------------------------------------
    ask_weakness: [
      t("And | what | about | weaknesses?", "O | kaip | dėl | silpnybių?", "O kaip dėl silpnybių?"),
      t("And | what's | your | greatest | weakness?", "O | kokia yra | jūsų | didžiausia | silpnybė?", "O kokia jūsų didžiausia silpnybė?"),
      t("And | your | weaknesses?", "O | jūsų | silpnybės?", "O jūsų silpnybės?"),
    ],
    weakness_ack: [
      t("Thank | you | for | being | honest.", "Dėkoju | jums, | kad | esate | {m:atviras|f:atvira}.", "Ačiū už atvirumą."),
      t("I | appreciate | your | honesty.", "Aš | vertinu | jūsų | atvirumą.", "Vertinu jūsų atvirumą."),
      t("Okay, | thank | you | for | sharing | that.", "Gerai, | dėkoju | jums, | kad | pasidalijote | tuo.", "Gerai, ačiū, kad pasidalijote."),
    ],
    english_ack: [
      t("Your | English | is | very | good! | And | it'll | only | get better | here.", "Jūsų | anglų kalba | yra | labai | gera! | Ir | ji | tik | gerės | čia.",
        "Jūs labai gerai kalbate angliškai! O čia kalba tik gerės.", { flags: { 6: "“'ll” (will): the future ending of gerės carries it." } }),
    ],
    ask_improve: [
      t("And | how | are | you | working on | that?", "O | kaip | — | jūs | stengiatės pagerinti | tai?", "O kaip stengiatės tai pagerinti?", { flags: { 2: F_PROG } }),
    ],
    improve_ack: [t("That's | great.", "Tai | puiku.", "Puiku."), t("Good | idea.", "Gera | mintis.", "Gera mintis.")],
    no_weak_1: [t("Ha! | Everyone | has | at least | one.", "Cha! | Kiekvienas | turi | bent | vieną.", "Cha! Kiekvienas turi bent vieną.")],
    ask_improve_what: [
      t("What's | something | you'd | like | to improve?", "Kas yra | tai, | ką jūs | norėtumėte | patobulinti?", "Ką norėtumėte patobulinti?", { flags: { 2: F_ID } }),
    ],
    no_weak_2: [t("Fair enough!", "Na, gerai!", "Na, gerai!")],

    // --- five years --------------------------------------------------------------------------------------
    ask_future: [
      t("Where | do | you | see | yourself | in | five | years?", "Kur | — | jūs | matote | save | po | penkerių | metų?", "Kur save matote po penkerių metų?", { flags: { 1: F_WH_DO } }),
      t("So, | where | do | you | see | yourself | in | five | years?", "Taigi, | kur | — | jūs | matote | save | po | penkerių | metų?", "Taigi, kur save matote po penkerių metų?", { flags: { 2: F_WH_DO } }),
    ],
    future_ack: [t("I | like | that.", "Man | patinka | tai.", "Man tai patinka."), t("That | sounds | great.", "Tai | skamba | puikiai.", "Skamba puikiai.")],
    future_away_ack: [t("Okay, | thanks | for | being | honest.", "Gerai, | ačiū, | kad | esate | {m:atviras|f:atvira}.", "Gerai, ačiū už atvirumą.")],
    future_help: [
      t("That's | okay. | What | would | you | like | to do | here?", "Tai | gerai. | Ką | — | jūs | norėtumėte | veikti | čia?", "Nieko tokio. Ką norėtumėte čia veikti?", { flags: { 3: F_WOULD } }),
    ],

    // --- teamwork --------------------------------------------------------------------------------------------
    ask_teamwork: [
      t("Can | you | tell | me | about | a | time | you | worked | on a team?", "Ar galite | jūs | papasakoti | man | apie | — | atvejį, kai | jūs | dirbote | komandoje?",
        "Ar galite papasakoti apie atvejį, kai dirbote komandoje?"),
      t("Can | you | give | me | an | example | of teamwork?", "Ar galite | jūs | pateikti | man | — | pavyzdį | komandinio darbo?", "Ar galite pateikti komandinio darbo pavyzdį?"),
    ],
    teamwork_ack: [
      t("That's | a | great | example.", "Tai yra | — | puikus | pavyzdys.", "Tai puikus pavyzdys."),
      t("Sounds | like | a | great | team!", "Skamba | kaip | — | puiki | komanda!", "Skamba kaip puiki komanda!"),
      t("Thank | you, | that's | really | helpful.", "Dėkoju | jums, | tai | tikrai | naudinga.", "Ačiū, tai tikrai naudinga."),
    ],
    no_team_ack: [t("That's | okay. | Thank | you.", "Tai | gerai. | Dėkoju | jums.", "Nieko tokio. Ačiū.")],
    example_help: [
      t("For example, | a | project | you | did | with | your | team.", "Pavyzdžiui, | — | projektas, kurį | jūs | atlikote | su | savo | komanda.",
        "Pavyzdžiui, projektas, kurį atlikote su savo komanda."),
    ],

    // --- languages -------------------------------------------------------------------------------------------
    ask_languages: [t("What | languages | do | you | speak?", "Kokiomis | kalbomis | — | jūs | kalbate?", "Kokiomis kalbomis kalbate?", { flags: { 2: F_WH_DO } })],
    languages_ack: [
      t("That's | great! | That | could | be | really | useful | here.", "Tai | puiku! | Tai | galėtų | būti | labai | naudinga | čia.", "Puiku! Čia tai galėtų būti labai naudinga."),
    ],
    languages_wow: [t("Wow, | that's | impressive!", "Oho, | tai | įspūdinga!", "Oho, įspūdinga!")],

    // --- work authorization --------------------------------------------------------------------------------------
    ask_authorized: [
      t("Are | you | authorized | to work | in the U.S.?", "Ar | jūs | turite teisę | dirbti | JAV?", "Ar turite teisę dirbti JAV?",
        { flags: { 0: "“Are” in a yes/no question = the particle ar; turite teisę (under “authorized”) takes over the copula." } }),
    ],
    auth_yes_ack: [t("Great, | thank | you.", "Puiku, | dėkoju | jums.", "Puiku, ačiū.")],
    auth_pending_ack: [t("Okay, | thanks | for | letting | me | know.", "Gerai, | ačiū, | kad | pranešėte | man | —.", "Gerai, ačiū, kad pranešėte.", { flags: { 5: F_KNOW } })],

    // --- salary ----------------------------------------------------------------------------------------------------
    ask_salary: [
      t("What | are | your | salary | expectations?", "Kokie | yra | jūsų | atlyginimo | lūkesčiai?", "Kokie jūsų atlyginimo lūkesčiai?"),
      t("And | what | salary | are | you | looking for?", "O | kokio | atlyginimo | — | jūs | tikitės?", "O kokio atlyginimo tikitės?", { flags: { 3: F_PROG } }),
    ],
    salary_noted: [
      t("Okay, | thank | you. | I'll note | that | down.", "Gerai, | dėkoju | jums. | Užsirašysiu | tai | —.", "Gerai, ačiū. Užsirašysiu.",
        { flags: { 5: "“down” (note … down): the prefix už- of užsirašysiu carries it." } }),
      t("Okay, | that's | helpful. | Thank | you.", "Gerai, | tai | naudinga. | Dėkoju | jums.", "Gerai, tai naudinga. Ačiū."),
    ],
    salary_range: [
      t("The | range | for | this | position | is | $48,000 | to | $55,000 | a | year, | depending on | experience.",
        "— | Atlyginimo intervalas | — | šioms | pareigoms | yra | nuo 48 000 | iki | 55 000 dolerių | per | metus, | priklausomai nuo | patirties.",
        "Šių pareigų atlyginimas – nuo 48 000 iki 55 000 dolerių per metus, priklausomai nuo patirties.",
        { say: "The range for this position is forty-eight to fifty-five thousand a year, depending on experience.",
          flags: { 2: "“for”: the dative šioms pareigoms carries it.", 9: F_A_PER } }),
    ],
    range_ok_q: [t("Does | that | work | for you?", "Ar | tai | tinka | jums?", "Ar jums tai tinka?", { flags: { 0: F_DOES_Q } })],
    range_later: [t("Okay, | we | can | talk | about | it | later.", "Gerai, | mes | galime | pasikalbėti | apie | tai | vėliau.", "Gerai, apie tai galėsime pasikalbėti vėliau.")],
    good_to_know: [t("Okay, | good | to know.", "Gerai, | gera | žinoti.", "Gerai, gera žinoti.")],

    // --- start date ------------------------------------------------------------------------------------------------------
    ask_start: [
      t("When | can | you | start?", "Kada | galite | jūs | pradėti?", "Kada galite pradėti?"),
      t("And | if | we | offer | you | the | job, | when | could | you | start?", "O | jei | mes | pasiūlysime | jums | — | darbą, | kada | galėtumėte | jūs | pradėti?",
        "O jei pasiūlysime jums darbą, kada galėtumėte pradėti?"),
    ],
    start_ack: [t("Perfect.", "Puiku.", "Puiku."), t("Great, | that | works.", "Puiku, | tai | tinka.", "Puiku, tinka.")],
    notice_ack: [t("Of course, | that's | completely | normal.", "Žinoma, | tai | visiškai | normalu.", "Žinoma, tai visiškai normalu.")],

    // --- why hire you ------------------------------------------------------------------------------------------------------
    ask_hire: [
      t("So, | why | should | we | hire | you?", "Taigi, | kodėl | turėtume | mes | priimti į darbą | jus?", "Taigi, kodėl turėtume priimti jus į darbą?"),
      t("And | finally: | why | should | we | hire | you?", "Ir | galiausiai: | kodėl | turėtume | mes | priimti į darbą | jus?", "Ir galiausiai: kodėl turėtume priimti jus į darbą?"),
    ],
    ask_hire_again: [t("So, | why | should | we | hire | you?", "Taigi, | kodėl | turėtume | mes | priimti į darbą | jus?", "Taigi, kodėl turėtume priimti jus į darbą?")],
    hire_ack: [
      t("Thank | you. | That's | very | clear.", "Dėkoju | jums. | Tai | labai | aišku.", "Ačiū. Labai aiškiai pasakyta."),
      t("I | like | that | answer.", "Man | patinka | tas | atsakymas.", "Man patinka šis atsakymas."),
    ],

    // --- the learner's questions -------------------------------------------------------------------------------------------
    ask_questions: [
      t("Do | you | have | any | questions | for me?", "Ar | jūs | turite | kokių nors | klausimų | man?", "Ar turite man klausimų?", { flags: { 0: F_DO_Q } }),
      t("So, | what | questions | do | you | have | for me?", "Taigi, | kokių | klausimų | — | jūs | turite | man?", "Taigi, kokių klausimų turite man?", { flags: { 3: F_WH_DO } }),
    ],
    ask_questions_other: [
      t("Do | you | have | any | other | questions | for me?", "Ar | jūs | turite | kokių nors | kitų | klausimų | man?", "Ar turite man daugiau klausimų?", { flags: { 0: F_DO_Q } }),
    ],
    ask_more_q: [
      t("Any | other | questions?", "Kokių nors | kitų | klausimų?", "Dar klausimų turite?"),
      t("What | else | would | you | like | to know?", "Ką | dar | — | jūs | norėtumėte | žinoti?", "Ką dar norėtumėte sužinoti?", { flags: { 2: F_WOULD } }),
      t("Anything | else?", "Ką nors | daugiau?", "Dar kas nors?"),
    ],
    go_ahead: [t("Sure, | go ahead.", "Žinoma, | klauskite.", "Žinoma, klauskite."), t("Of course!", "Žinoma!", "Žinoma!")],
    a_hours: [
      t("We | work | nine | to | five, | Monday | to | Friday.", "Mes | dirbame | nuo devynių | iki | penkių, | nuo pirmadienio | iki | penktadienio.",
        "Dirbame nuo devynių iki penkių, nuo pirmadienio iki penktadienio."),
    ],
    a_lunch: [t("And | you | get | an | hour | for lunch.", "Ir | jūs | turite | — | valandą | pietums.", "Ir turite valandą pietums.")],
    a_training: [
      t("Yes! | You'll have | two | weeks | of | training | with | a | mentor.", "Taip! | Jūs turėsite | dvi | savaites | — | mokymų | su | — | mentoriumi.",
        "Taip! Turėsite dviejų savaičių mokymus su mentoriumi.", { flags: { 4: "“of”: the genitive mokymų carries it." } }),
    ],
    a_start: [
      t("Probably | on | the | first | of | next | month.", "Tikriausiai | — | — | pirmąją | — | kito | mėnesio.", "Tikriausiai kito mėnesio pirmąją dieną.",
        { flags: { 1: "Date “on”: the accusative pirmąją carries it.", 4: "“of”: the genitive kito mėnesio carries it." } }),
    ],
    a_team: [
      t("There | are | eight | people | on the team.", "— | Yra | aštuoni | žmonės | komandoje.", "Komandoje yra aštuoni žmonės.",
        { flags: { 0: "Existential “There” has no Lithuanian word; yra carries it." } }),
    ],
    a_team2: [
      t("You'd | work | with | Maria | and | a | few | others.", "Jūs | dirbtumėte | su | Marija | ir | — | keliais | kitais.", "Dirbtumėte su Marija ir keliais kitais kolegomis.",
        { flags: { 0: F_ID } }),
    ],
    a_remote: [
      t("You | can | work | from | home | two | days | a | week.", "Jūs | galite | dirbti | iš | namų | dvi | dienas | per | savaitę.", "Dvi dienas per savaitę galite dirbti iš namų.",
        { flags: { 7: F_A_PER } }),
    ],
    a_benefits: [
      t("You | get | health | insurance | and | fifteen | days | of | paid | vacation.", "Jūs | gaunate | sveikatos | draudimą | ir | penkiolika | dienų | — | apmokamų | atostogų.",
        "Gaunate sveikatos draudimą ir penkiolika dienų apmokamų atostogų.", { flags: { 7: "“of”: the genitive atostogų carries it." } }),
    ],
    a_day: [
      t("You'd | answer | client | emails | and | calls, | and | help | the | team | with | projects.",
        "Jūs | atsakinėtumėte į | klientų | laiškus | ir | skambučius, | ir | padėtumėte | — | komandai | su | projektais.",
        "Atsakinėtumėte į klientų laiškus ir skambučius ir padėtumėte komandai su projektais.", { flags: { 0: F_ID } }),
    ],
    a_next: [t("We're talking | to | a | few | other | candidates | this | week.", "Mes kalbamės | su | — | keliais | kitais | kandidatais | šią | savaitę.",
      "Šią savaitę kalbamės dar su keliais kandidatais.")],
    a_touch: [t("We'll be in touch | by | Friday.", "Susisieksime | iki | penktadienio.", "Susisieksime iki penktadienio.")],
    a_dress: [t("It's | business | casual.", "Tai yra | dalykinis | laisvas stilius.", "Laisvas dalykinis stilius.")],
    a_parking: [t("Yes, | there's | free | parking | behind | the | building.", "Taip, | yra | nemokama | stovėjimo aikštelė | už | — | pastato.",
      "Taip, už pastato yra nemokama stovėjimo aikštelė.")],
    a_like: [t("The | people! | Everyone | here | is | really | friendly.", "— | Žmonės! | Visi | čia | yra | tikrai | draugiški.", "Žmonės! Visi čia labai draugiški.")],
    a_unknown: [
      t("Good | question! | I'll check | and | let | you | know.", "Geras | klausimas! | Pasitikslinsiu | ir | pranešiu | jums | —.", "Geras klausimas! Pasitikslinsiu ir jums pranešiu.",
        { flags: { 6: "“know” (let … know): pranešiu (under “let”) carries it." } }),
    ],
    great_questions: [t("Great | questions!", "Puikūs | klausimai!", "Puikūs klausimai!")],

    // --- closing -------------------------------------------------------------------------------------------------------
    closing: [
      t("Well, | thank | you | so much | for | coming in | today.", "Na, | dėkoju | jums | labai, | kad | atvykote | šiandien.", "Na, labai ačiū, kad šiandien atvykote."),
      t("Thank | you | so much | for | your | time | today.", "Dėkoju | jums | labai | už | jūsų | laiką | šiandien.", "Labai ačiū, kad šiandien skyrėte laiko."),
    ],
    closing_next: [
      t("We'll be in touch | soon.", "Susisieksime | netrukus.", "Netrukus susisieksime."),
      t("We'll be in touch | in | a | few | days.", "Susisieksime | per | — | kelias | dienas.", "Susisieksime per kelias dienas."),
    ],
    closing_reply: [
      t("You're welcome. | Good luck, | and | have | a | great | day!", "Prašom. | Sėkmės, | ir | linkiu | — | puikios | dienos!", "Prašom. Sėkmės ir puikios dienos!"),
      t("My | pleasure. | Have | a | great | day!", "Mano | malonumas. | Linkiu | — | puikios | dienos!", "Man malonu. Puikios dienos!"),
    ],
    closing_bye: [
      t("It was | nice | to meet | you. | Have | a | great | day!", "Buvo | malonu | susipažinti | su jumis. | Linkiu | — | puikios | dienos!", "Buvo malonu susipažinti. Puikios dienos!"),
    ],
    closing_nice: [
      t("It was | nice | to meet | you | too. | Have | a | great | day!", "Buvo | malonu | susipažinti | su jumis | taip pat. | Linkiu | — | puikios | dienos!",
        "Man taip pat buvo malonu susipažinti. Puikios dienos!"),
    ],

    // --- the job offer (twist) ------------------------------------------------------------------------------------------
    offer: [
      t("Actually, | I | don't need | to wait. | We'd | like | to offer | you | the | job!", "Tiesą sakant, | man | nereikia | laukti. | Mes | norėtume | pasiūlyti | jums | — | darbą!",
        "Tiesą sakant, man nereikia laukti. Norėtume jums pasiūlyti šį darbą!", { flags: { 4: F_ID } }),
    ],
    offer_yes: [t("Wonderful! | Welcome | to | the | team!", "Nuostabu! | Sveiki atvykę | į | — | komandą!", "Nuostabu! Sveiki prisijungę prie komandos!")],
    offer_contract: [t("We'll send | you | the | contract | today.", "Mes atsiųsime | jums | — | sutartį | šiandien.", "Sutartį atsiųsime jums šiandien.")],
    offer_think: [
      t("Of course. | Take your time, | and | let | us | know | by | Friday.", "Žinoma. | Neskubėkite, | ir | praneškite | mums | — | iki | penktadienio.",
        "Žinoma. Neskubėkite ir praneškite mums iki penktadienio.", { flags: { 5: F_KNOW } }),
    ],
    offer_no: [t("Oh, | I | see. | Well, | thank | you | for | your | time.", "O, | aš | suprantu. | Na, | dėkoju | jums | už | jūsų | laiką.", "O, suprantu. Na, ačiū už jūsų laiką.")],
    offer_again: [t("So, | what | do | you | say?", "Tai | ką | — | jūs | sakote?", "Tai ką sakote?", { flags: { 2: F_WH_DO } })],

    // --- phone call (twist) ------------------------------------------------------------------------------------------------
    phone: [
      t("Oh, | I'm | so | sorry, | I | need | to take | this | call. | Just | one | second.", "O, | aš | labai | atsiprašau, | man | reikia | atsiliepti į | šį | skambutį. | Tik | vieną | sekundę.",
        "O, labai atsiprašau, turiu atsiliepti į šį skambutį. Tik vieną sekundę.", { flags: { 1: "“'m” (am): atsiprašau is a verb, so the copula has no word here." } }),
    ],
    phone_back: [
      t("Thank | you | for | waiting. | Sorry | about | that!", "Dėkoju | jums, | kad | palaukėte. | Atsiprašau | dėl | to!", "Ačiū, kad palaukėte. Atsiprašau!"),
      t("Sorry | about | that! | Where | were | we?", "Atsiprašau | dėl | to! | Kur | sustojome | mes?", "Atsiprašau! Kur mes sustojome?"),
    ],

    // --- side moves -------------------------------------------------------------------------------------------------------------
    nervous_ok: [
      t("Don't worry, | you're doing | great!", "Nesijaudinkite, | jums sekasi | puikiai!", "Nesijaudinkite, jums puikiai sekasi!"),
      t("That's | totally | normal. | You're doing | great.", "Tai | visiškai | normalu. | Jums sekasi | puikiai.", "Tai visiškai normalu. Jums puikiai sekasi."),
    ],
    resume_thanks: [t("Thank | you! | I | have | it | right here.", "Dėkoju | jums! | Aš | turiu | jį | čia pat.", "Ačiū! Jis jau pas mane.")],
    ack: [t("Okay.", "Gerai.", "Gerai."), t("I | see.", "Aš | suprantu.", "Suprantu.")],
  },

  hints: {
    arrive: {
      lt: "Pasakyti, kad atvykai į darbo pokalbį",
      items: [
        { id: "have_interview", s: t("Hi, | I | have | an | interview | at | 9:30.", "Sveiki, | aš | turiu | — | darbo pokalbį | — | 9:30.", "Sveiki, 9:30 turiu darbo pokalbį.",
          { say: "Hi, I have an interview at nine thirty.", flags: { 5: F_AT_CLOCK } }) },
        { id: "here_for", s: t("I'm | here | for | an | interview.", "Aš esu | čia | dėl | — | darbo pokalbio.", "Atvykau į darbo pokalbį.") },
        { id: "here_see", s: t("I'm | here | to see | Ms. | Brooks.", "Aš esu | čia | susitikti su | ponia | Bruks.", "Atvykau susitikti su ponia Bruks.") },
        { id: "intro_full", s: t("Hi, | I'm | {$name} | {$surname}.", "Sveiki, | aš esu | {$name} | {$surname}.", "Sveiki, aš {$name} {$surname}.") },
        { id: "my_name", s: t("My | name | is | {$name}.", "Mano | vardas | yra | {$name}.", "Mano vardas – {$name}.") },
      ],
    },
    name: {
      lt: "Pasakyti savo vardą ir pavardę",
      items: [
        { id: "intro_full", s: t("I'm | {$name} | {$surname}.", "Aš esu | {$name} | {$surname}.", "Aš {$name} {$surname}.") },
        { id: "my_name", s: t("My | name | is | {$name}.", "Mano | vardas | yra | {$name}.", "Mano vardas – {$name}.") },
        { id: "intro_full", s: t("It's | {$name} | {$surname}.", "Tai | {$name} | {$surname}.", "{$name} {$surname}.", { flags: { 0: "“'s” (is): Lithuanian needs no copula here." } }) },
      ],
    },
    found: {
      lt: "Atsakyti, ar lengvai radai biurą",
      items: [
        { id: "found_no_problem", s: t("Yes, | no | problem.", "Taip, | jokių | problemų.", "Taip, jokių problemų.") },
        { id: "found_easy", s: t("Yes, | it | was | easy | to find.", "Taip, | jį | buvo | lengva | rasti.", "Taip, buvo lengva rasti.") },
        { id: "found_lost", s: t("I | got | a little | lost.", "Aš | — | truputį | pasiklydau.", "Truputį pasiklydau.",
          { flags: { 1: "“got” (got lost): pasiklydau (under “lost”) carries it." } }) },
      ],
    },
    drink: {
      lt: "Pasakyti, ar nori vandens ar kavos",
      items: [
        { id: "water", s: t("Some | water, | please.", "— | Vandens, | prašau.", "Vandens, prašau.", { flags: { 0: "Partitive “some”: the genitive vandens carries it." } }) },
        { id: "no_fine", s: t("No, | I'm | fine, | thanks.", "Ne, | man | gerai, | ačiū.", "Ne, nieko nereikia, ačiū.") },
        { id: "coffee", s: t("Coffee | would | be | great, | thanks.", "Kavos | — | būtų | puiku, | ačiū.", "Kavos būtų puiku, ačiū.",
          { flags: { 1: "“would” has no separate word: the conditional būtų carries it (linked to “be”)." } }) },
      ],
    },
    years: {
      lt: "Pasakyti, kiek metų dirbi",
      items: [
        { id: "years_about", s: t("About | ten | years.", "Apie | dešimt | metų.", "Apie dešimt metų.") },
        { id: "years_for", s: t("For | five | years.", "— | Penkerius | metus.", "Penkerius metus.", { flags: { 0: F_DUR } }) },
        { id: "years_since", s: t("Since | 2015.", "Nuo | 2015 metų.", "Nuo 2015 metų.", { say: "Since twenty fifteen." }) },
      ],
    },
    studied: {
      lt: "Pasakyti, ką studijavai",
      items: [
        { id: "studied", s: t("I | studied | marketing.", "Aš | studijavau | rinkodarą.", "Studijavau rinkodarą.") },
        { id: "studied", s: t("I | studied | economics.", "Aš | studijavau | ekonomiką.", "Studijavau ekonomiką.") },
      ],
    },
    phone: {
      lt: "Pasakyti, kad nieko tokio",
      items: [
        { id: "np_sure", s: t("Sure, | no | problem.", "Žinoma, | jokių | problemų.", "Žinoma, nieko tokio.") },
        { id: "np_course", s: t("Of course!", "Žinoma!", "Žinoma!") },
        { id: "np_time", s: t("Take your time.", "Neskubėkite.", "Neskubėkite.") },
      ],
    },
    improve: {
      lt: "Pasakyti, kaip tai tobulini",
      items: [
        { id: "wk_classes", s: t("I'm taking | classes.", "Aš lankau | kursus.", "Lankau kursus.") },
        { id: "wk_lists", s: t("I | make | lists.", "Aš | sudarau | sąrašus.", "Sudarau darbų sąrašus.") },
        { id: "wk_say_no", s: t("I'm learning | to say | no.", "Aš mokausi | pasakyti | „ne“.", "Mokausi pasakyti „ne“.") },
      ],
    },
    range: {
      lt: "Atsakyti, ar tinka",
      items: [
        { id: "range_yes", s: t("Yes, | that | works | for me.", "Taip, | tai | tinka | man.", "Taip, man tinka.") },
        { id: "range_more", s: t("I | was | hoping | for | a little | more.", "Aš | — | tikėjausi | — | truputį | daugiau.", "Tikėjausi truputį daugiau.",
          { flags: { 1: "Past progressive “was”: the past tense of tikėjausi carries it (linked to “hoping”).", 3: "“for”: tikėtis takes the genitive, so “for” has no word." } }) },
      ],
    },
    no_q: {
      lt: "Pasakyti, kad klausimų nebeturi",
      items: [
        { id: "q_none", s: t("No, | I | think | you've | covered | everything.", "Ne, | aš | manau, | jūs | aptarėte | viską.", "Ne, manau, jūs viską aptarėte.",
          { flags: { 3: "Perfect “'ve” has no separate word: the past aptarėte carries it." } }) },
        { id: "q_none_all", s: t("No, | that's | all. | Thank | you.", "Ne, | tai yra | viskas. | Dėkoju | jums.", "Ne, tai viskas. Ačiū.") },
      ],
    },
    about_job: aboutGroup(),
    about_field: {
      lt: "Pasakyti, kurioje srityje dirbi", slot: "field", examples: ["sales", "it", "healthcare", "construction"],
      items: [
        { id: "f_work_in", s: t("I | work | in {X}.", "Aš | dirbu | {X:loc}.", "Dirbu {X:loc}."), only: (e) => !e.attrs?.multi },
        { id: "f_work_in", s: t("I | work | in | {X}.", "Aš | dirbu | — | {X:loc}.", "Dirbu {X:loc}.", { flags: { 2: F_IN } }), only: (e) => !!e.attrs?.multi },
        { id: "f_exp", s: t("I | have | ten | years | of | experience | in {X}.", "Aš | turiu | dešimties | metų | — | patirtį | {X:loc}.", "Turiu dešimties metų patirtį {X:loc}.",
          { flags: { 4: F_OF_YEARS } }), only: (e) => !e.attrs?.multi },
        { id: "f_exp", s: t("I | have | ten | years | of | experience | in | {X}.", "Aš | turiu | dešimties | metų | — | patirtį | — | {X:loc}.", "Turiu dešimties metų patirtį {X:loc}.",
          { flags: { 4: F_OF_YEARS, 6: F_IN } }), only: (e) => !!e.attrs?.multi },
        { id: "f_years", s: t("I've | worked | in {X} | for | twenty | years.", "Aš | dirbu | {X:loc} | — | dvidešimt | metų.", "Jau dvidešimt metų dirbu {X:loc}.",
          { flags: { 0: F_VE, 3: F_DUR } }), only: (e) => !e.attrs?.multi },
        { id: "f_background", s: t("My | background | is | in {X}.", "Mano | patirtis | yra | {X:loc}.", "Mano patirtis – {X:loc}."), only: (e) => !e.attrs?.multi },
      ],
    },
    about_more: {
      lt: "Papasakoti daugiau apie save",
      items: [
        { id: "from_lt", s: t("I'm | from | Lithuania.", "Aš esu | iš | Lietuvos.", "Aš iš Lietuvos.") },
        { id: "moved", s: t("I | moved | here | two | months | ago.", "Aš | atsikrausčiau | čia | prieš du | mėnesius | —.", "Atsikrausčiau čia prieš du mėnesius.",
          { flags: { 6: "“ago”: prieš (under “two”) carries it." } }) },
        { id: "no_exp", s: t("I | don't have | much | experience | yet.", "Aš | neturiu | daug | patirties | dar.", "Dar neturiu daug patirties.") },
        { id: "my_name", s: t("My | name | is | {$name}.", "Mano | vardas | yra | {$name}.", "Mano vardas – {$name}.") },
      ],
    },
    leaving: {
      lt: "Pasakyti, kodėl ieškai naujo darbo",
      items: [
        { id: "l_moved", s: t("I | moved | here | with | my | family.", "Aš | atsikrausčiau | čia | su | savo | šeima.", "Atsikrausčiau čia su šeima.") },
        { id: "l_challenge", s: t("I'm looking | for | a | new | challenge.", "Aš ieškau | — | — | naujo | iššūkio.", "Ieškau naujo iššūkio.",
          { flags: { 1: "“for”: the genitive iššūkio after ieškoti carries it." } }) },
      ],
    },
    why: {
      lt: "Pasakyti, kodėl nori čia dirbti",
      items: [
        { id: "w_like", s: t("I | really | like | your | company.", "Man | labai | patinka | jūsų | įmonė.", "Man labai patinka jūsų įmonė.") },
        { id: "w_grow", s: t("I | want | to grow | and | learn | new | things.", "Aš | noriu | augti | ir | mokytis | naujų | dalykų.", "Noriu augti ir mokytis naujų dalykų.") },
        { id: "w_challenge", s: t("I'm | ready | for | a | new | challenge.", "Aš esu | {m:pasiruošęs|f:pasiruošusi} | — | — | naujam | iššūkiui.",
          "Esu {m:pasiruošęs|f:pasiruošusi} naujam iššūkiui.", { flags: { 2: "“for”: the dative naujam iššūkiui carries it." } }) },
        { id: "w_heard", s: t("I've | heard | great | things | about | Brightline.", "Aš | girdėjau | puikių | dalykų | apie | „Brightline“.", "Girdėjau daug gero apie „Brightline“.",
          { flags: { 0: "Perfect “'ve” has no separate word: the past girdėjau carries it." } }) },
        { id: "w_use", s: t("I'd like | to use | my | experience | here.", "Norėčiau | panaudoti | savo | patirtį | čia.", "Norėčiau čia panaudoti savo patirtį.") },
        { id: "w_people", s: t("I | enjoy | working | with | people.", "Man | patinka | dirbti | su | žmonėmis.", "Man patinka dirbti su žmonėmis.") },
        { id: "w_reputation", s: t("Your | company | has | a | great | reputation.", "Jūsų | įmonė | turi | — | puikią | reputaciją.", "Jūsų įmonės reputacija puiki.") },
      ],
    },
    strengths: strengthGroup(),
    strengths_more: {
      lt: "Papasakoti, ką darai gerai",
      items: [
        { id: "learn_fast", s: t("I | learn | fast.", "Aš | mokausi | greitai.", "Greitai mokausi.") },
        { id: "good_people", s: t("I'm | good | with | people.", "Aš esu | {m:geras|f:gera} | su | žmonėmis.", "Moku bendrauti su žmonėmis.") },
        { id: "team_well", s: t("I | work | well | in a team.", "Aš | dirbu | gerai | komandoje.", "Gerai dirbu komandoje.") },
        { id: "never_late", s: t("I'm | never | late.", "Aš | niekada | nevėluoju.", "Niekada nevėluoju.",
          { flags: { 0: "“'m” (am): Lithuanian uses the verb vėluoti, so the copula has no word here.", 2: "Negative concord: nevėluoju takes the ne- from “never” (C-CONCORD)." } }) },
        { id: "s_very", s: t("I'm | organized, | and | I | learn | fast.", "Aš esu | {m:organizuotas|f:organizuota}, | ir | aš | mokausi | greitai.",
          "Esu {m:organizuotas|f:organizuota} ir greitai mokausi.") },
        { id: "pressure", s: t("I | stay | calm | under pressure.", "Aš | išlieku | {m:ramus|f:rami} | esant įtampai.", "Net esant įtampai išlieku {m:ramus|f:rami}.") },
        { id: "not_afraid", s: t("I'm | not afraid | to ask.", "Aš | nebijau | klausti.", "Nebijau klausti.",
          { flags: { 0: "“'m” (am): Lithuanian uses the verb bijoti (to be afraid), so the copula has no word here." } }) },
        { id: "langs", s: t("I | speak | three | languages.", "Aš | kalbu | trimis | kalbomis.", "Kalbu trimis kalbomis.") },
      ],
    },
    weakness: {
      lt: "Pasakyti silpnybę (ir kaip ją tobulini)",
      items: [
        { id: "wk_hard", s: t("Sometimes | I | work | too | hard.", "Kartais | aš | dirbu | per | daug.", "Kartais per daug dirbu.") },
        { id: "wk_perfectionist", s: t("I'm | a | perfectionist.", "Aš esu | — | {m:perfekcionistas|f:perfekcionistė}.", "Esu {m:perfekcionistas|f:perfekcionistė}.") },
        { id: "wk_impatient", s: t("I | can | be | a little | impatient.", "Aš | galiu | būti | truputį | {m:nekantrus|f:nekantri}.", "Kartais būnu truputį {m:nekantrus|f:nekantri}.") },
        { id: "wk_english", s: t("My | English | isn't | perfect | yet, | but | I'm taking | classes.", "Mano | anglų kalba | nėra | tobula | dar, | bet | aš lankau | kursus.",
          "Mano anglų kalba dar nėra tobula, bet lankau kursus.") },
        { id: "wk_take_on", s: t("Sometimes | I | take on | too | much.", "Kartais | aš | prisiimu | per | daug.", "Kartais prisiimu per daug darbų.") },
        { id: "wk_public", s: t("Public | speaking | isn't | easy | for me.", "Viešas | kalbėjimas | nėra | lengvas | man.", "Man nelengva kalbėti viešai.") },
        { id: "wk_better", s: t("But | I'm | getting better.", "Bet | aš | tobulėju.", "Bet aš tobulėju.",
          { flags: { 1: "Progressive “'m” has no separate word: the present tense of tobulėju carries it (linked to “getting better”)." } }) },
      ],
    },
    future: {
      lt: "Pasakyti, kur save matai po penkerių metų",
      items: [
        { id: "fu_here", s: t("Right | here, | with | you.", "Būtent | čia, | su | jumis.", "Būtent čia, su jumis.") },
        { id: "fu_lead", s: t("I'd like | to lead | a | team.", "Norėčiau | vadovauti | — | komandai.", "Norėčiau vadovauti komandai.") },
        { id: "fu_grow", s: t("I | hope | to grow | with | the | company.", "Aš | tikiuosi | augti | kartu su | — | įmone.", "Tikiuosi augti kartu su įmone.") },
        { id: "fu_management", s: t("In | a | management | position.", "— | — | Vadovaujančiose | pareigose.", "Vadovaujančiose pareigose.",
          { flags: { 0: "“In”: the locative of vadovaujančiose pareigose carries it (an adjective intervenes, C-CASE-DASH)." } }) },
        { id: "fu_become", s: t("I'd like | to become | a | team | leader.", "Norėčiau | tapti | — | komandos | {m:vadovu|f:vadove}.", "Norėčiau tapti komandos {m:vadovu|f:vadove}.") },
      ],
    },
    teamwork: {
      lt: "Trumpai papasakoti apie darbą komandoje",
      items: [
        { id: "tw_helped", s: t("I | helped | a | new | colleague.", "Aš | padėjau | — | naujam | kolegai.", "Padėjau naujam kolegai.") },
        { id: "tw_together", s: t("We | worked | together | as | a | team.", "Mes | dirbome | kartu | kaip | — | komanda.", "Dirbome kartu kaip komanda.") },
        { id: "tw_each_other", s: t("We | helped | each other.", "Mes | padėjome | vienas kitam.", "Padėjome vienas kitam.") },
        { id: "tw_project", s: t("At | my | last | job, | we | finished | a | big | project | on time.", "— | Mano | ankstesniame | darbe, | mes | baigėme | — | didelį | projektą | laiku.",
          "Ankstesniame darbe mes laiku užbaigėme didelį projektą.", { flags: { 0: "“At”: the locative ankstesniame darbe carries it (a possessive and an adjective intervene, C-CASE-DASH)." } }) },
        { id: "tw_team_of", s: t("I | worked | in a team | of | five | people.", "Aš | dirbau | komandoje | iš | penkių | žmonių.", "Dirbau penkių žmonių komandoje.") },
      ],
    },
    languages: {
      lt: "Pasakyti, kokiomis kalbomis kalbi", slot: "language", examples: ["lithuanian", "russian", "polish", "german"],
      items: [
        { id: "l_speak", s: t("I | speak | {X} | and | English.", "Aš | kalbu | {X:ins} | ir | anglų kalba.", "Kalbu {X:ins} ir anglų kalba."), only: (e) => e.id !== "english" },
        { id: "l_native", s: t("My | native | language | is | {X}.", "Mano | gimtoji | kalba | yra | {X:nom}.", "Mano gimtoji kalba – {X:nom}."), only: (e) => e.id !== "english" },
        { id: "l_little", s: t("I | also | speak | a little | {X}.", "Aš | taip pat | kalbu | truputį | {X:ins}.", "Taip pat šiek tiek kalbu {X:ins}."),
          only: (e) => e.id !== "english" && e.id !== "lithuanian" },
      ],
    },
    authorized: {
      lt: "Atsakyti apie leidimą dirbti JAV",
      items: [
        { id: "a_green", s: t("Yes, | I | have | a | green card.", "Taip, | aš | turiu | — | žaliąją kortą.", "Taip, turiu žaliąją kortą.") },
        { id: "a_permit", s: t("Yes, | I | have | a | work | permit.", "Taip, | aš | turiu | — | darbo | leidimą.", "Taip, turiu leidimą dirbti.") },
        { id: "a_waiting", s: t("Not yet. | I'm waiting | for | my | work | permit.", "Dar ne. | Aš laukiu | — | savo | darbo | leidimo.", "Dar ne. Laukiu leidimo dirbti.",
          { flags: { 2: "“for”: the genitive leidimo after laukti carries it." } }) },
      ],
    },
    salary: {
      lt: "Pasakyti, kokio atlyginimo tikiesi",
      items: [
        { id: "s_amount", s: t("Around | $50,000 | a | year.", "Apie | 50 000 dolerių | per | metus.", "Apie 50 000 dolerių per metus.",
          { say: "Around fifty thousand a year.", flags: { 2: F_A_PER } }) },
        { id: "s_flexible", s: t("I'm | flexible.", "Aš esu | {m:lankstus|f:lanksti}.", "Galime derėtis – esu {m:lankstus|f:lanksti}.") },
        { id: "s_range_q", s: t("What's | the | range | for | this | position?", "Koks yra | — | intervalas | — | šioms | pareigoms?", "Koks šių pareigų atlyginimo intervalas?",
          { flags: { 3: "“for”: the dative šioms pareigoms carries it." } }) },
        { id: "s_range", s: t("Something | between | $45,000 | and | $50,000.", "Kažkur | tarp | 45 000 | ir | 50 000 dolerių.", "Kažkur tarp 45 000 ir 50 000 dolerių.",
          { say: "Something between forty-five and fifty thousand." }) },
        { id: "s_amount", s: t("$25 | an | hour.", "25 dolerius | per | valandą.", "25 dolerius per valandą.", { say: "Twenty-five dollars an hour.", flags: { 1: F_A_PER } }) },
        { id: "s_flexible", s: t("I'm | flexible.", "Aš esu | {m:lankstus|f:lanksti}.", "Galime derėtis – esu {m:lankstus|f:lanksti}.") },
      ],
    },
    start: {
      lt: "Pasakyti, kada galėtum pradėti",
      items: [
        { id: "st_monday", s: t("I | can | start | next | Monday.", "Aš | galiu | pradėti | kitą | pirmadienį.", "Galiu pradėti kitą pirmadienį.") },
        { id: "st_asap", s: t("As soon as possible.", "Kuo greičiau.", "Kuo greičiau.") },
        { id: "st_weeks", s: t("In | two | weeks.", "Po | dviejų | savaičių.", "Po dviejų savaičių.") },
        { id: "st_notice", s: t("I | need | to give | two | weeks' | notice.", "Aš | turiu | įspėti | prieš dvi | savaites | —.", "Turiu įspėti dabartinį darbdavį prieš dvi savaites.",
          { flags: { 5: "“notice”: the verb įspėti (under “to give”) carries it." } }), note: "Amerikoje apie išėjimą iš darbo įprasta įspėti prieš dvi savaites („two weeks' notice“)." },
      ],
    },
    hire: {
      lt: "Pasakyti, kodėl turėtų priimti būtent tave",
      items: [
        { id: "h_experience", s: t("I | have | the | right | experience.", "Aš | turiu | — | tinkamą | patirtį.", "Turiu tinkamą patirtį.") },
        { id: "s_very", s: t("Because | I'm | organized, | and | I | learn | fast.", "Nes | aš esu | {m:organizuotas|f:organizuota}, | ir | aš | mokausi | greitai.",
          "Nes esu {m:organizuotas|f:organizuota} ir greitai mokausi.") },
        { id: "h_right", s: t("I'm | the | right | person | for | this | job.", "Aš esu | — | tinkamas | žmogus | — | šiam | darbui.", "Esu tinkamas žmogus šiam darbui.",
          { flags: { 4: "“for”: the dative šiam darbui carries it." } }) },
        { id: "h_chance", s: t("Give | me | a | chance, | and | you'll see!", "Suteikite | man | — | galimybę, | ir | jūs pamatysite!", "Suteikite man galimybę, ir pamatysite!") },
      ],
    },
    ask_them: {
      lt: "Paklausti apie darbą",
      items: [
        { id: "q_hours", s: t("What | are | the | working | hours?", "Koks | yra | — | darbo | laikas?", "Koks darbo laikas?") },
        { id: "q_training", s: t("Is | there | any | training?", "Ar yra | — | kokių nors | mokymų?", "Ar bus mokymų?", { flags: { 1: "Existential “there” has no Lithuanian word; yra (under “Is”) carries it." } }) },
        { id: "q_start", s: t("When | would | I | start?", "Kada | — | aš | pradėčiau?", "Kada pradėčiau?", { flags: { 1: F_WOULD } }) },
      ],
    },
    ask_them2: {
      lt: "Paklausti apie darbą",
      items: [
        { id: "q_team", s: t("How | big | is | the | team?", "Kokio | dydžio | yra | — | komanda?", "Kokio dydžio komanda?") },
        { id: "q_remote", s: t("Can | I | work | from | home?", "Ar galiu | aš | dirbti | iš | namų?", "Ar galiu dirbti iš namų?") },
        { id: "q_benefits", s: t("What | are | the | benefits?", "Kokios | yra | — | papildomos naudos?", "Kokios papildomos naudos darbuotojams?") },
      ],
    },
    ask_them3: {
      lt: "Paklausti apie darbą",
      items: [
        { id: "q_day", s: t("What | does | a | typical | day | look like?", "Kaip | — | — | įprasta | diena | atrodo?", "Kaip atrodo įprasta darbo diena?", { flags: { 1: F_WH_DO } }) },
        { id: "q_next", s: t("What | are | the | next | steps?", "Kokie | yra | — | tolesni | žingsniai?", "Kokie tolesni žingsniai?") },
        { id: "q_dress", s: t("Is | there | a | dress | code?", "Ar yra | — | — | aprangos | kodas?", "Ar yra aprangos kodas?", { flags: { 1: "Existential “there” has no Lithuanian word; yra (under “Is”) carries it." } }) },
      ],
    },
    closing: {
      lt: "Padėkoti ir atsisveikinti",
      items: [
        { id: "c_thanks_time", s: t("Thank | you | for | your | time.", "Dėkoju | jums | už | jūsų | laiką.", "Ačiū, kad skyrėte laiko.") },
        { id: "c_nice_meet", s: t("It was | nice | to meet | you.", "Buvo | malonu | susipažinti | su jumis.", "Buvo malonu susipažinti.") },
        { id: "c_opportunity", s: t("Thank | you | for | the | opportunity.", "Dėkoju | jums | už | — | galimybę.", "Ačiū už galimybę.") },
        { id: "c_look_forward", s: t("I | look forward | to | hearing | from | you.", "Aš | laukiu | — | žinių | iš | jūsų.", "Lauksiu žinių iš jūsų.",
          { flags: { 2: "“to”: laukti takes the genitive (žinių), so “to” has no word." } }) },
      ],
    },
    offer: {
      lt: "Atsakyti į darbo pasiūlymą",
      items: [
        { id: "o_accept", s: t("Thank | you! | I | accept!", "Dėkoju | jums! | Aš | sutinku!", "Ačiū! Sutinku!") },
        { id: "o_wonderful", s: t("That's | wonderful | news!", "Tai | nuostabi | žinia!", "Kokia nuostabi žinia!") },
        { id: "o_think", s: t("Can | I | think | about | it?", "Ar galiu | aš | pagalvoti | apie | tai?", "Ar galiu pagalvoti?") },
      ],
    },
    side: {
      lt: "Jei jaudiniesi ar nesupratai klausimo",
      items: [
        { id: "x_nervous", s: t("Sorry, | I'm | a little | nervous.", "Atsiprašau, | aš esu | truputį | {m:susijaudinęs|f:susijaudinusi}.", "Atsiprašau, truputį jaudinuosi.") },
        { id: "c_repeat", s: t("Could | you | repeat | the | question, | please?", "Ar galėtumėte | jūs | pakartoti | — | klausimą, | prašau?", "Ar galėtumėte pakartoti klausimą?") },
        { id: "x_resume", s: t("Here's | my | résumé.", "Štai | mano | gyvenimo aprašymas.", "Štai mano gyvenimo aprašymas.") },
      ],
    },
  },

  tips: {
    us_resume: { key: "us_resume", lt: "Suprasta! Amerikoje gyvenimo aprašymas vadinamas „résumé“ (tariama „reziumė“), o ne CV.", better: "Here's my résumé." },
    us_vacation: { key: "us_vacation", lt: "Suprasta! Amerikoje atostogos – „vacation“ arba „paid time off“, o „holidays“ – šventinės dienos.", better: "How many vacation days do I get?" },
    us_position: { key: "us_position", lt: "Suprasta! Amerikoje dažniau sakoma „position“ arba „job opening“.", better: "I'm here about the position." },
    us_years_of: { key: "us_years_of", lt: "Suprasta! Amerikiečiai dažniau sako „ten years of experience“.", better: "I have ten years of experience." },
    need_job: { key: "need_job", lt: "Suprasta! Darbo pokalbyje geriau pabrėžti motyvaciją, pvz. „I'm ready for a new challenge.“", better: "I'm ready for a new challenge." },
    neg_boss: { key: "neg_boss", lt: "Suprasta! Pokalbyje geriau nekritikuoti buvusio darbdavio – verčiau pasakyti, ko ieškai.", better: "I'm looking for a new challenge." },
    us_restroom: { key: "us_restroom", lt: "Suprasta! Amerikoje mandagiau sakyti „restroom“ arba „bathroom“.", better: "Where's the restroom?" },
    neg_money: { key: "neg_money", lt: "Suprasta! Pokalbio pradžioje apie pinigus geriau neužsiminti – apie atlyginimą paprastai paklausia patys.", better: "I'm looking for a new challenge." },
  },

  merges: {
    "coming in": { reason: "lexical_expression", split: "coming → ateinate + in → vidun is unidiomatic in the formula “thanks for coming in”; = atvykote.", minimal: "Verb and particle." },
    "how long": { reason: "lexical_expression", split: "how → kaip + long → ilgai gives “kaip ilgai”, a calque of the duration question; = kiek laiko.", minimal: "Two words." },
    "how many": { reason: "lexical_expression", split: "how → kaip + many → daug gives “kaip daug”; asking a number = kiek.", minimal: "Two words." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives “mažas”; the degree adverb “a little” = truputį.", minimal: "Two words." },
    "looking for": { reason: "lexical_expression", split: "looking → žiūrite + for → už is false; look for = ieškoti (tikėtis about a salary).", minimal: "Verb and particle." },
    "working on": { reason: "lexical_expression", split: "working → dirbate + on → ant is false; “work on (a weakness)” = stengtis pagerinti.", minimal: "Verb and particle." },
    "getting better": { reason: "lexical_expression", split: "getting → gaunu + better → geriau is false; get better = tobulėti.", minimal: "Two words." },
    "get better": { reason: "lexical_expression", split: "get → gauti + better → geriau is false; get better = gerėti.", minimal: "Two words." },
    "take on": { reason: "lexical_expression", split: "take → imu + on → ant is false; take on (work) = prisiimti (C-PHR).", minimal: "Verb and particle." },
    "not afraid": { reason: "grammatical_fusion", split: "not → ne + afraid → bijantis: Lithuanian says this with the verb bijoti and the negation is its prefix ne- (nebijau).", minimal: "Two words." },
    "not yet": { reason: "lexical_expression", split: "not → ne + yet → dar gives the order “ne dar”; the reply = dar ne.", minimal: "Two words." },
    "green card": { reason: "lexical_expression", split: "green → žalia + card → kortelė is a literal description; the US permanent resident card is called žalioji korta.", minimal: "Two words, one document." },
    "under pressure": { reason: "lexical_expression", split: "under → po + pressure → spaudimu is a calque; = esant įtampai.", minimal: "Two words." },
    "each other": { reason: "lexical_expression", split: "each → kiekvienas + other → kitas is false; the reciprocal = vienas kitam.", minimal: "Two words." },
    "look like": { reason: "lexical_expression", split: "look → žiūri + like → kaip is false; look like = atrodyti.", minimal: "Two words." },
    "depending on": { reason: "lexical_expression", split: "depending → priklausantis + on → ant is false; = priklausomai nuo.", minimal: "Two words." },
    "we'll be in touch": { reason: "lexical_expression", split: "We'll be → būsime + in → — + touch → prisilietime is false; the formula = susisieksime.", minimal: "The words form the formula." },
    "it was": { reason: "grammatical_fusion", split: "Dummy “it” has no Lithuanian word; the impersonal buvo absorbs it (C-DUMMY).", minimal: "Two words." },
    "look forward": { reason: "lexical_expression", split: "look → žiūrėti + forward → pirmyn is false; look forward (to) = laukti.", minimal: "Two words." },
    "in the u.s": { reason: "grammatical_fusion", split: "in → — + the → — + U.S. → JAV: the abbreviation JAV (indeclinable) stands for the locative here (C-CASE).", minimal: "No glossable word inside." },
    "as soon as possible": { reason: "lexical_expression", split: "as → kaip, soon → greitai, as → kaip, possible → įmanoma is a calque; = kuo greičiau.", minimal: "The four words form the formula." },
    "go ahead": { reason: "lexical_expression", split: "go → eikite + ahead → pirmyn is a literal movement; the invitation to ask = klauskite.", minimal: "Two words." },
    "good luck": { reason: "lexical_expression", split: "good → gera + luck → sėkmė gives “gera sėkmė”; the wish = sėkmės.", minimal: "Two words." },
    "right here": { reason: "lexical_expression", split: "right → dešinė/teisingai + here → čia is false; = čia pat.", minimal: "Two words." },
    "makes sense": { reason: "lexical_expression", split: "makes → daro + sense → prasmę is a calque; = suprantama.", minimal: "Two words." },
    "at least": { reason: "lexical_expression", split: "at → prie + least → mažiausiai is false; = bent.", minimal: "Two words." },
    "down the hall": { reason: "lexical_expression", split: "down → žemyn, the → —, hall → koridorius is false; the direction = koridoriaus gale.", minimal: "The three words form the phrase." },
    "fair enough": { reason: "lexical_expression", split: "fair → teisinga + enough → pakankamai is false; the concession = na, gerai.", minimal: "Two words." },
    "for example": { reason: "lexical_expression", split: "for → už + example → pavyzdys is false; = pavyzdžiui.", minimal: "Two words." },
    "hi there": { reason: "lexical_expression", split: "there → ten would add a false place; “Hi there” is one greeting (= sveiki).", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  steps: [
    { id: "arrive", done: (c) => !!c.s.arrived,
      ask: (c) => {
        if (!c.s.greetSaid) { c.s.greetSaid = true; c.s.lastQ = c.s.greetKind; c.say(c.s.greetKind === "interview" ? "greet_interview" : "greet_help"); }
        else { c.s.lastQ = "interview"; c.say("purpose_again"); }
      },
      expects: ["arrive", "intro_name", "intro_ctx"],
      suggest: [S_ARRIVE, S_SIDE],
      yes: (c) => {
        if (c.s.lastQ === "interview") { arrived(c); return; }
        c.s.lastQ = "interview"; c.say("purpose_again"); c.hold();
      },
      no: (c) => { c.s.lastQ = "help"; c.say("how_help"); c.hold(); } },
    { id: "name", when: (c) => !!c.s.arrived, done: (c) => !!c.s.named || c.s.nameAsked >= 3,
      ask: (c) => c.say(c.s.nameAsked++ ? "name_again" : "ask_name"),
      expects: ["intro_name", "intro_ctx"], suggest: [S_NAME] },
    { id: "found", when: (c) => !!c.s.named && c.s.small === "found", done: (c) => !!c.s.smallDone || asked(c, "found") >= 2,
      ask: (c) => { bump(c, "found"); c.say("ask_found"); },
      expects: ["found_ok", "found_hard"],
      suggest: [{ lt: "Atsakyti, ar lengvai radai biurą", hint: "found" }],
      yes: (c) => { c.s.smallDone = true; c.say("found_good"); },
      no: (c) => { c.s.smallDone = true; c.say("found_bad"); } },
    { id: "drink", when: (c) => !!c.s.named && c.s.small === "drink", done: (c) => !!c.s.smallDone || asked(c, "drink") >= 2,
      ask: (c) => { bump(c, "drink"); c.say("offer_drink"); },
      expects: ["want_drink", "no_drink"],
      suggest: [{ lt: "Pasakyti, ar nori vandens ar kavos", hint: "drink" }],
      yes: (c) => { c.s.smallDone = true; giveDrink(c, false); },
      no: (c) => { c.s.smallDone = true; c.say("no_drink_ok"); } },
    { id: "about", when: (c) => !!c.s.named, done: aboutDone,
      ask: (c) => askAbout(c),
      expects: ABOUT_INTENTS,
      suggest: [S_JOB, S_FIELD, S_ABOUT_MORE],
      help: (c) => { c.say("what_know_help"); } },
    { id: "leaving", when: (c) => qOn("leaving")(c) && !me(c).noExp && !me(c).student, done: done("leaving"), ask: (c) => { bump(c, "leaving"); c.say("ask_leaving"); },
      expects: ["leaving_ans", "moved", "between_jobs"], suggest: [{ lt: "Pasakyti, kodėl ieškai naujo darbo", hint: "leaving" }],
      help: (c) => { c.say("ack"); c.s.done.leaving = true; } },
    { id: "why", when: (c) => !!c.s.named, done: done("why"),
      ask: (c) => { bump(c, "why"); c.say("ask_why"); },
      expects: ["why_ans", "strength", "hire_ans"], suggest: [{ lt: "Pasakyti, kodėl nori čia dirbti", hint: "why" }],
      help: (c) => { c.say("why_ack"); c.s.done.why = true; } },
    // Twist: the phone rings (returning visits). Asked once; any answer moves on.
    { id: "phone", when: (c) => !!c.s.phoneTwist && !!c.s.named && !!c.s.done.why, done: (c) => !!c.s.phoneAsked,
      ask: (c) => { c.s.phoneAsked = true; c.twist("phone"); c.say("phone"); },
      expects: ["no_problem"], suggest: [{ lt: "Pasakyti, kad nieko tokio", hint: "phone" }],
      yes: (c) => { c.say("phone_back"); }, no: (c) => { c.say("phone_back"); } },
    { id: "strengths", when: (c) => !!c.s.named, done: done("strengths"),
      ask: (c) => { bump(c, "strengths"); c.say("ask_strengths"); },
      expects: STRENGTH_INTENTS, suggest: [S_STRENGTH, S_STRENGTH_MORE],
      help: (c) => { c.say("strength_help"); } },
    { id: "weakness", when: qOn("weakness"), done: done("weakness"), ask: (c) => { bump(c, "weakness"); c.say("ask_weakness"); },
      expects: ["weakness", "working_on_it", "no_weakness", "no_weakness_ctx", "not_strength"], suggest: [{ lt: "Pasakyti silpnybę (ir kaip ją tobulini)", hint: "weakness" }] },
    { id: "teamwork", when: qOn("teamwork"), done: done("teamwork"), ask: (c) => { bump(c, "teamwork"); c.say("ask_teamwork"); },
      expects: ["teamwork_ans", "story_ctx", "no_team", "strength"], suggest: [{ lt: "Trumpai papasakoti apie darbą komandoje", hint: "teamwork" }],
      help: (c) => { c.say("example_help"); } },
    { id: "future", when: qOn("future"), done: done("future"),
      ask: (c) => { bump(c, "future"); c.say("ask_future"); },
      expects: ["future_ans", "future_away"], suggest: [{ lt: "Pasakyti, kur save matai po penkerių metų", hint: "future" }],
      help: (c) => { c.say("future_help"); } },
    { id: "languages", when: qOn("languages"), done: done("languages"), ask: (c) => { bump(c, "languages"); c.say("ask_languages"); },
      expects: ["languages_ans", "languages_ctx"], suggest: [{ lt: "Pasakyti, kokiomis kalbomis kalbi", hint: "languages", options: "language" }] },
    { id: "authorized", when: qOn("authorized"), done: done("authorized"), ask: (c) => { bump(c, "authorized"); c.say("ask_authorized"); },
      expects: ["auth_yes", "auth_pending"], suggest: [{ lt: "Atsakyti, ar turi teisę dirbti JAV", hint: "authorized" }],
      yes: (c) => { c.s.done.authorized = true; c.say("auth_yes_ack"); },
      no: (c) => { c.s.done.authorized = true; c.say("auth_pending_ack"); } },
    { id: "salary", when: qOn("salary"), done: done("salary"), ask: (c) => { bump(c, "salary"); c.say("ask_salary"); },
      expects: ["salary_ans", "salary_flexible", "salary_range_q", "salary_more"], suggest: [{ lt: "Pasakyti, kokio atlyginimo tikiesi (arba paklausti intervalo)", hint: "salary" }],
      help: (c) => { interview.handlers.salary_range_q(c, {}, { intent: "salary_range_q", slots: {}, tags: [] }); } },
    { id: "start", when: qOn("start"), done: done("start"), ask: (c) => { bump(c, "start"); c.say("ask_start"); },
      expects: ["start_ans"], suggest: [{ lt: "Pasakyti, kada galėtum pradėti", hint: "start" }] },
    { id: "hire", when: qOn("hire"), done: done("hire"),
      ask: (c) => { bump(c, "hire"); c.say(asked(c, "hire") > 1 ? "ask_hire_again" : "ask_hire"); },
      expects: ["hire_ans", ...STRENGTH_INTENTS], suggest: [{ lt: "Pasakyti, kodėl turėtų priimti būtent tave", hint: "hire" }, S_STRENGTH] },
    { id: "questions", when: (c) => !!c.s.named, done: (c) => !!c.s.qDone || asked(c, "questions") >= 6,
      ask: (c) => {
        bump(c, "questions");
        if (!c.s.qAsked) { c.s.qAsked = true; c.say(c.s.qCount ? "ask_questions_other" : "ask_questions"); }
        else c.say("ask_more_q");
        // the model questions move on to ones the learner hasn't asked yet
        const [set, , label] = Q_SETS.find(([, keys]) => keys.every((k) => !c.s.asked[k])) ?? Q_SETS.find(([, keys]) => keys.some((k) => !c.s.asked[k])) ?? Q_SETS[2];
        const sg: Suggestion[] = [{ lt: label, hint: set }, S_NO_Q];
        c.expect({ id: "questions", optional: true, expects: Q_INTENTS, suggest: sg, hints: [set, "no_q"] });
      },
      expects: Q_INTENTS,
      suggest: [S_ASK, S_NO_Q],
      yes: (c) => {
        // "Yes (I have one)" invites the question; "Okay." after "Anything else?" closes the round
        const first = asked(c, "questions") <= 1 && !c.s.qCount;
        if (first || /\b(yes|yeah|yep|actually|one more|i have)\b/.test(heard(c))) { c.say("go_ahead"); c.hold(); return; }
        c.s.qDone = true;
      },
      no: (c) => { c.s.qDone = true; } },
  ],

  init: (c) => {
    c.s.me = {} as Me;
    c.s.done = {};
    c.s.aboutAsks = 0;
    c.s.nameAsked = 0;
    c.s.qCount = 0;
    c.s.asked = {};
    c.s.greetKind = c.chance(0.5) ? "interview" : "help";
    c.s.small = c.chance(0.55) ? (c.chance(0.5) ? "found" : "drink") : null;
    // A different selection of the classic questions on each visit (at most three).
    const pool: [string, number][] = [["weakness", 0.8], ["start", 0.55], ["salary", 0.45], ["future", 0.45], ["hire", 0.45],
      ["teamwork", 0.35], ["leaving", 0.3], ["languages", 0.3], ["authorized", 0.2]];
    const picked = pool.filter(([, p]) => c.chance(p)).map(([id]) => id);
    while (picked.length > 3) picked.splice(1 + Math.floor(c.rng() * (picked.length - 1)), 1);
    c.s.qs = picked;
    c.s.improveQ = c.chance(0.35);
    // Twists (returning visits only)
    c.s.phoneTwist = c.visits >= 1 && c.chance(0.3);
    c.s.offerTwist = c.visits >= 1 && c.chance(0.35);
  },

  start: () => { /* the first step says the greeting */ },

  handlers: {
    // --- arriving ---
    arrive(c, slots, seg) {
      const tm = slots.time as { h: number; m: number } | undefined;
      if (seg.tags.includes("brooks") && !c.s.meSaid) { c.s.meSaid = true; c.say("thats_me"); }
      if (tm && !(tm.h % 12 === 9 && tm.m === 30) && !c.s.timeSaid) { c.s.timeSaid = true; c.say("other_time"); }
      if (seg.tags.includes("early") && !c.s.earlySaid) { c.s.earlySaid = true; c.say("early_ok"); }
      if (!c.s.arrived) arrived(c);
    },
    intro_name(c, slots) { named(c, slots.name); },
    intro_ctx(c, slots) {
      named(c, slots.name);
      if (!c.s.arrived && c.s.lastQ === "interview") arrived(c);
      else if (!c.s.arrived) { c.s.lastQ = "interview"; c.say("purpose_again"); c.hold(); }
    },

    // --- small talk ---
    found_ok(c) { if (c.s.small === "found" && !c.s.smallDone) { c.s.smallDone = true; c.say("found_good"); } else c.say("ack"); },
    found_hard(c) { if (c.s.small === "found" && !c.s.smallDone) { c.s.smallDone = true; c.say("found_bad"); } else c.say("ack"); },
    want_drink(c, _s, seg) { c.s.smallDone = true; giveDrink(c, seg.tags.includes("coffee")); },
    no_drink(c) { c.s.smallDone = true; c.say("no_drink_ok"); },

    // --- about you ---
    job_is(c, slots, seg) { if (slots.job) setJob(c, slots.job); readExp(c, slots, seg); aboutAck(c, slots); },
    job_ctx(c, slots, seg) { if (slots.job) setJob(c, slots.job); readExp(c, slots, seg); aboutAck(c, slots); },
    job_does(c, slots, seg) {
      // "I teach math" names the job unless the learner already said it ("I'm a nurse, I help patients")
      const known = !!me(c).job;
      if (!known && slots.duty) setJob(c, slots.duty);
      readExp(c, slots, seg);
      aboutAck(c, known ? { dur: slots.dur, year: slots.year } : { ...slots, job: slots.duty });
    },
    field_is(c, slots, seg) { if (slots.field) me(c).field = slots.field; readExp(c, slots, seg); aboutAck(c, slots); },
    field_ctx(c, slots, seg) { if (slots.field) me(c).field = slots.field; readExp(c, slots, seg); aboutAck(c, slots); },
    experience(c, slots, seg) {
      if (slots.job) setJob(c, slots.job);
      if (slots.field) me(c).field = slots.field;
      readExp(c, slots, seg);
      if (me(c).years == null) me(c).years = seg.tags.includes("some") ? 2 : 10;
      aboutAck(c, slots);
    },
    years_ctx(c, slots, seg) {
      readExp(c, slots, seg);
      if (me(c).years == null) me(c).years = seg.tags.includes("few") ? 1 : 10;
      aboutAck(c, slots);
    },
    no_exp(c, slots, seg) {
      if (slots.field) me(c).field = slots.field;
      me(c).noExp = true;
      c.s.aboutInfo = (c.s.aboutInfo || 0) + 1;
      if (seg.tags.includes("grad")) me(c).grad = true;
      if (c.step === "weakness") { markWeakness(c); return; }
      ackOnce(c, "no_exp_ok");
    },
    no_exp_ctx(c) { me(c).noExp = true; ackOnce(c, "no_exp_ok"); },
    between_jobs(c) { me(c).between = true; if (c.step === "leaving") { c.s.done.leaving = true; } ackOnce(c, "leaving_ack"); },
    own_business(c) { me(c).own = true; ackOnce(c, "about_ack"); },
    from(c, slots) { me(c).from = slots.country; ackOnce(c, slots.country === "lithuania" ? "from_lt" : "nice"); },
    moved(c) {
      if (c.step === "leaving") { c.s.done.leaving = true; ackOnce(c, "leaving_ack"); return; }
      if (turn(c).acked) return;
      ackOnce(c, "moved_ack");
      if (!c.s.englishSaid && c.chance(0.5)) { c.s.englishSaid = true; c.say("english_good"); }
    },
    family(c) { ackOnce(c, "nice"); },
    age(c) { ackOnce(c, "about_ack"); },
    studied_unknown(c) { c.s.aboutInfo = (c.s.aboutInfo || 0) + 1; ackOnce(c, "about_ack"); },
    about_name_ctx(c) { /* "I'm Anna": the name is already known */ },
    not_job(c) { ackOnce(c, "not_job_ack"); },
    why_neg(c) { if (c.step === "why") c.s.done.why = true; ackOnce(c, "why_neg_ack"); },
    q_restroom(c) { c.say("a_restroom"); },
    her_name(c) { c.say("brooks_name"); },
    free_time_unknown(c) { ackOnce(c, "nice"); },
    about_end(c) { if (c.step === "about" && !aboutKnown(c)) return; c.s.aboutAsks = 3; },
    what_know(c) { c.say("what_know_help"); c.hold(); },

    // --- why a new job / why here ---
    // "Why a new job?" and "Why here?" are often answered with each other's reasons: count them for the question asked
    leaving_ans(c) { if (c.step === "why") { c.s.done.why = true; ackOnce(c, "why_ack"); return; } c.s.done.leaving = true; ackOnce(c, "leaving_ack"); },
    why_ans(c) { if (c.step === "leaving") { c.s.done.leaving = true; ackOnce(c, "leaving_ack"); return; } c.s.done.why = true; ackOnce(c, "why_ack"); },

    // --- strengths ---
    strength(c, slots, seg) { strengthAnswer(c, toArr(slots.strength), seg.tags); },
    strength_ctx(c, slots, seg) { strengthAnswer(c, toArr(slots.strength), seg.tags); },
    not_strength(c) {
      if (c.step === "weakness") { markWeakness(c); return; }
      if (c.step === "strengths" || c.step === "hire") { c.say("not_strength_ack"); c.hold(); return; }
      ackOnce(c, "ack");
    },

    // --- weaknesses ---
    weakness(c) {
      if (/\benglish\b/.test(heard(c))) { c.s.englishWeak = true; }
      markWeakness(c);
    },
    working_on_it(c) {
      turn(c).improving = true;
      if (c.s.done.weakness || c.step === "weakness") { c.s.done.weakness = true; ackOnce(c, c.s.englishWeak ? "english_ack" : "improve_ack"); return; }
      ackOnce(c, "improve_ack");
    },
    no_weakness(c) { noWeakness(c); },
    no_weakness_ctx(c) { noWeakness(c); },

    // --- five years ---
    future_ans(c) { c.s.done.future = true; ackOnce(c, "future_ack"); },
    future_away(c) { c.s.done.future = true; ackOnce(c, "future_away_ack"); },

    // --- teamwork ---
    teamwork_ans(c) { c.s.done.teamwork = true; ackOnce(c, "teamwork_ack"); },
    story_ctx(c) { c.s.done.teamwork = true; ackOnce(c, "teamwork_ack"); },
    no_team(c) { c.s.done.teamwork = true; ackOnce(c, "no_team_ack"); },
    example_q(c) { c.say("example_help"); c.hold(); },

    // --- languages ---
    languages_ans(c, slots) { languages(c, toArr(slots.language).length, /\b(three|four|five|several|many)\b/.test(heard(c))); },
    languages_ctx(c, slots) { languages(c, toArr(slots.language).length, false); },

    // --- work authorization ---
    auth_yes(c) { if (c.step !== "authorized") { c.say("ack"); return; } c.s.done.authorized = true; c.say("auth_yes_ack"); },
    auth_pending(c) { if (c.step !== "authorized") { c.say("ack"); return; } c.s.done.authorized = true; c.say("auth_pending_ack"); },

    // --- salary ---
    salary_ans(c) { c.s.done.salary = true; ackOnce(c, "salary_noted"); },
    salary_flexible(c) { c.s.done.salary = true; ackOnce(c, "good_to_know"); },
    salary_more(c) { c.s.done.salary = true; ackOnce(c, "range_later"); },
    salary_range_q(c) {
      c.s.asked.salary = true;
      c.say("salary_range");
      if (c.step === "salary" && !c.s.done.salary) {
        c.say("range_ok_q");
        c.expect({ id: "range", expects: ["salary_ans", "salary_flexible", "salary_more"], hints: ["range", "salary"],
          suggest: [{ lt: "Atsakyti, ar tinka", hint: "range" }, { lt: "Pasakyti savo sumą", hint: "salary" }],
          yes: (cc) => { cc.s.done.salary = true; cc.say("good_to_know"); },
          no: (cc) => { cc.s.done.salary = true; cc.say("range_later"); },
          on: {
            salary_more: (cc) => { cc.s.done.salary = true; cc.say("range_later"); },
            salary_ans: (cc) => { cc.s.done.salary = true; cc.say("salary_noted"); },
            salary_flexible: (cc) => { cc.s.done.salary = true; cc.say("good_to_know"); },
          },
          ask: (cc) => cc.say("range_ok_q") });
      } else countQuestion(c);
    },

    // --- start date ---
    start_ans(c, _s, seg) {
      if (seg.tags.includes("cant")) { if (c.step === "start") { c.say("ask_start_when"); c.hold(); } else c.say("ack"); return; }
      if (c.step !== "start" && c.s.done.start) { c.say("ack"); return; }
      c.s.done.start = true;
      ackOnce(c, seg.tags.includes("notice") ? "notice_ack" : "start_ack");
    },

    // --- why hire you ---
    hire_ans(c) {
      if (c.step === "why") { c.s.done.why = true; ackOnce(c, "why_ack"); return; }
      c.s.done.hire = true;
      if (c.step === "strengths") c.s.done.strengths = true;
      ackOnce(c, "hire_ack");
    },

    // --- the learner's questions ---
    can_ask(c) { c.say("go_ahead"); c.hold(); },
    q_hours(c) { answerQ(c, "hours", () => { c.say("a_hours"); c.say("a_lunch"); }); },
    q_training(c) { answerQ(c, "training", () => c.say("a_training")); },
    q_start(c) { answerQ(c, "start", () => c.say("a_start")); },
    q_team(c) { answerQ(c, "team", () => { c.say("a_team"); c.say("a_team2"); }); },
    q_remote(c) { answerQ(c, "remote", () => c.say("a_remote")); },
    q_benefits(c) { answerQ(c, "benefits", () => c.say("a_benefits")); },
    q_day(c) { answerQ(c, "day", () => c.say("a_day")); },
    q_next(c) { answerQ(c, "next", () => { c.say("a_next"); c.say("a_touch"); }); },
    q_dress(c) { answerQ(c, "dress", () => c.say("a_dress")); },
    q_parking(c) { answerQ(c, "parking", () => c.say("a_parking")); },
    q_like(c) { answerQ(c, "like", () => c.say("a_like")); },
    q_other_ctx(c) { answerQ(c, "unknown", () => c.say("a_unknown")); },
    no_questions(c) { if (c.step === "questions") c.s.qDone = true; else if (!c.s.__finished) c.say("ack"); },

    // --- closing (before the end: a polite answer) ---
    // said while Ms. Brooks waits for the learner's questions, these close the round ("no more questions")
    thanks_time(c) { if (c.step === "questions" && !c.s.qDone) { c.s.qDone = true; return; } if (!c.s.__finished) c.say("g_welcome"); },
    look_forward(c) { if (c.step === "questions" && !c.s.qDone) { c.s.qDone = true; return; } c.say("ack"); },
    nice_meet(c) { if (!c.s.named) return; c.say("ack"); },

    // --- job offer (outside the offer moment) ---
    accept_job(c) { c.say("ack"); },
    think_offer(c) { c.say("ack"); },
    decline_offer(c) { c.say("ack"); },

    // --- side moves ---
    nervous(c) { c.say("nervous_ok"); },
    resume(c) { c.say("resume_thanks"); },
    no_problem(c) { c.say(c.step === "phone" ? "phone_back" : "ack"); },
  },

  finish: (c) => {
    flush(c);
    if (c.s.offerTwist) {
      c.twist("offer");
      c.say("offer");
      c.expect({ id: "offer", expects: ["accept_job", "think_offer", "decline_offer"], hints: ["offer"],
        suggest: [{ lt: "Atsakyti į darbo pasiūlymą", hint: "offer" }],
        on: {
          accept_job: (cc) => { offerYes(cc); },
          g_thanks: (cc) => { offerYes(cc); },
          thanks_time: (cc) => { offerYes(cc); },
          think_offer: (cc) => { cc.say("offer_think"); closeUp(cc, false); },
          decline_offer: (cc) => { cc.say("offer_no"); closeUp(cc, false); },
        },
        yes: (cc) => { offerYes(cc); },
        no: (cc) => { cc.say("offer_no"); closeUp(cc, false); },
        ask: (cc) => cc.say("offer_again") });
      return;
    }
    c.say("closing");
    c.say("closing_next");
    closeUp(c, false);
  },

  tests: [
    { say: "Hi, I have an interview at 9:30.", intent: "arrive", slots: { time: { h: 9, m: 30 } } },
    { say: "Good morning! I'm here to see Ms. Brooks.", intent: "arrive" },
    { say: "I'm here for a job interview.", intent: "arrive" },
    { say: "I'm here about the vacancy.", intent: "arrive" },
    { say: "Tomas Mikalauskas", intent: "intro_ctx", step: "name" },
    { say: "Tomas", intent: "none" },
    { say: "Yes, it was easy to find.", intent: "found_ok", step: "found" },
    { say: "No, I'm fine, thanks.", intent: "no_drink", step: "drink" },
    { say: "Some water would be great, thanks.", intent: "want_drink", step: "drink" },
    { say: "I'm an accountant with ten years of experience.", intent: "job_is", slots: { job: "accountant", dur: 10 } },
    { say: "I've been a nurse for fifteen years.", intent: "job_is", slots: { job: "nurse", dur: 15 } },
    { say: "I work as a software developer.", intent: "job_is", slots: { job: "programmer" } },
    { say: "I work in sales.", intent: "field_is", slots: { field: "sales" } },
    { say: "I have five years experience in marketing.", intent: "experience", slots: { dur: 5, field: "marketing" } },
    { say: "About ten years.", intent: "years_ctx", step: "about", slots: { dur: 10 } },
    { say: "Accountant.", intent: "job_ctx", step: "about", slots: { job: "accountant" } },
    { say: "I don't have much experience yet.", intent: "no_exp", not: ["experience"] },
    { say: "I'm from Lithuania.", intent: "from", slots: { country: "lithuania" } },
    { say: "I love your products.", intent: "why_ans" },
    { say: "I've heard great things about Brightline.", intent: "why_ans" },
    { say: "I need a job.", intent: "why_ans" },
    { say: "I'm very organized and I learn fast.", intent: "strength" },
    { say: "I'm a team player.", intent: "strength", slots: { strength: "team_player" } },
    { say: "Patient and reliable.", intent: "strength_ctx", step: "strengths" },
    { say: "I'm not very organized.", intent: "not_strength", not: ["strength"] },
    { say: "Sometimes I work too hard.", intent: "weakness" },
    { say: "My English isn't perfect yet, but I'm taking classes.", intent: "weakness" },
    { say: "I don't have any weaknesses.", intent: "no_weakness", not: ["weakness"] },
    { say: "Leading a team.", intent: "future_ans", step: "future" },
    { say: "At my last job, we finished a big project on time.", intent: "teamwork_ans", step: "teamwork" },
    { say: "I usually work alone.", intent: "no_team", step: "teamwork", not: ["teamwork_ans"] },
    { say: "I speak Lithuanian, Russian and English.", intent: "languages_ans" },
    { say: "Yes, I have a green card.", intent: "auth_yes", step: "authorized" },
    { say: "Not yet, I'm waiting for my work permit.", intent: "auth_pending", step: "authorized", not: ["auth_yes"] },
    { say: "Around 50,000 a year.", intent: "salary_ans", step: "salary", slots: { amount: 50000 } },
    { say: "What's the salary range for this position?", intent: "salary_range_q" },
    { say: "I can start next Monday.", intent: "start_ans" },
    { say: "I need to give two weeks' notice.", intent: "start_ans" },
    { say: "I can't start before next month.", intent: "start_ans" },
    { say: "Because I'm the right person for this job.", intent: "hire_ans" },
    { say: "What are the working hours?", intent: "q_hours" },
    { say: "Is there any training?", intent: "q_training" },
    { say: "How much holiday do I get?", intent: "q_benefits" },
    { say: "What does a typical day look like?", intent: "q_day" },
    { say: "No, I think you've answered everything.", intent: "no_questions", step: "questions" },
    { say: "Thank you for your time.", intent: "thanks_time" },
    { say: "I look forward to hearing from you.", intent: "look_forward" },
    { say: "Here's my CV.", intent: "resume" },
    { say: "Sorry, I'm a little nervous.", intent: "nervous" },
    { say: "Thank you, I accept!", intent: "accept_job" },
    { say: "Could you repeat the question, please?", intent: "g_repeat" },
    { say: "I'm not an accountant.", intent: "not_job", not: ["job_is"] },
    { say: "I don't want to lead a team.", intent: "future_away", not: ["future_ans"] },
    { say: "Maybe a team leader.", intent: "future_ans", step: "future" },
    { say: "I don't like your company.", intent: "why_neg", not: ["why_ans"] },
    { say: "What's your name?", intent: "her_name" },
    { say: "Where's the restroom?", intent: "q_restroom" },
    { say: "I'm a bit early.", intent: "arrive" },
    { say: "Well, I'm Anna, I'm twenty-eight, and I've got five years' experience in sales.", intent: "about_name_ctx", step: "about" },
    { say: "Is there a gym?", intent: "q_other_ctx", step: "questions" },
    { say: "banana rocket purple sky", intent: "none" },
    { say: "My cat plays the piano every night", intent: "none" },
    // more ways to say it (dev corpus: tests/corpus/s87-interview.json)
    { say: "I am nurse", intent: "job_is", slots: { job: "nurse" } },
    { say: "I work like accountant ten years", intent: "job_is", slots: { job: "accountant" } },
    { say: "Ten years I work as a driver", intent: "job_is", slots: { job: "driver", dur: 10 } },
    { say: "I drive a truck", intent: "job_does", slots: { duty: "truck_driver" } },
    { say: "I work in a hospital", intent: "field_is", slots: { field: "healthcare" } },
    { say: "I finished university last year", intent: "no_exp" },
    { say: "I have appointment with Miss Brooks", intent: "arrive" },
    { say: "My first name is Tomas and my last name is Mikalauskas", intent: "intro_name", step: "name" },
    { say: "It's a good opportunity for me", intent: "why_ans", step: "why" },
    { say: "I pay attention to details", intent: "strength", step: "strengths" },
    { say: "Punctuality and honesty", intent: "strength_ctx", step: "strengths" },
    { say: "The company went bankrupt", intent: "leaving_ans", step: "leaving" },
    { say: "My weakness is that I'm too perfectionist", intent: "weakness", step: "weakness" },
    { say: "You won't regret it", intent: "hire_ans", step: "hire" },
    { say: "Yes, I have green card", intent: "auth_yes", step: "authorized" },
    { say: "Not yet, my papers are in process", intent: "auth_pending", step: "authorized" },
    { say: "I want to open my own business", intent: "future_away", step: "future" },
    { say: "I need two weeks to finish my current job", intent: "start_ans", step: "start" },
    { say: "I know English and German", intent: "languages_ans", step: "languages" },
    { say: "It's negotiable", intent: "salary_flexible", step: "salary" },
    { say: "When will you call me?", intent: "q_next", step: "questions" },
    { say: "No, everything is clear", intent: "no_questions", step: "questions" },
    { say: "I'm very happy, thank you!", intent: "accept_job" },
    { say: "No coffee for me, thanks", intent: "no_drink", step: "drink", not: ["want_drink"] },
    { say: "I don't work well under pressure", intent: "not_strength", step: "strengths", not: ["strength"] },
    { say: "I'm not nurse", intent: "not_job", not: ["job_is"] },
    { say: "I don't have a green card", intent: "auth_pending", step: "authorized", not: ["auth_yes"] },
    { say: "Because I want to work in a bigger team and learn new things.", intent: "why_ans", step: "why" },
    { say: "Because I want to work in a bigger team and learn new things.", intent: "leaving_ans", step: "leaving" },
    { say: "I don't want to work in a big team.", intent: "none", step: "leaving" },
    { say: "Is there a parking place?", intent: "q_parking" },
    { say: "Because your company is growing and I want to be part of it.", intent: "why_ans", step: "why" },
  ],

  sims: [
    { name: "classic interview", turns: ["Good morning! I have an interview at 9:30.", "Tomas Mikalauskas.", "I'm an accountant with ten years of experience.",
      "I love your company, and I'm ready for a new challenge.", "I'm very organized, and I learn fast.", "What are the working hours?",
      "No, I think you've answered everything.", "Thank you for your time!"], expect: { complete: true }, auto: AUTO },
    { name: "short answers and questions", turns: ["Hello!", "I'm here for an interview.", "My name is Tomas.", "I'm a nurse.", "Fifteen years.",
      "I've heard great things about Brightline.", "Patient and reliable.", "Is there any training?", "Can I work from home?", "No, that's all.",
      "Thank you for the opportunity. It was nice to meet you!"], expect: { complete: true }, auto: AUTO },
    { name: "side moves: wrong time, résumé, nervous, early questions", turns: ["Hi! Are you Ms. Brooks?", "I have an interview at ten.", "I'm Tomas Mikalauskas.",
      "Here's my résumé.", "Sorry, I'm a little nervous.", "I work in sales.", "Eight years.", "I want to grow and learn new things.",
      "What's the salary range for this position?", "I'm a team player.", "When would I start?", "What does a typical day look like?", "Nothing else, thanks.",
      "I look forward to hearing from you."], expect: { complete: true }, auto: AUTO },
    { name: "no experience yet", turns: ["Hi!", "Yes.", "Tomas.", "I just finished college. I studied marketing.", "I like working with people.", "I'm friendly and I'm never late.",
      "What are the next steps?", "No, thank you.", "Thank you, bye!"], expect: { complete: true }, auto: AUTO },
  ],
};

// ---------------------------------------------------------------------------
// Hint groups built per gender

function aboutGroup() {
  return {
    lt: "Pasakyti, kuo dirbi", slot: "job", examples: ["accountant", "nurse", "engineer", "driver"],
    items: [
      { id: "job_im", s: t("I'm | {X.np}.", "Aš esu | {X.np:nom}.", "Esu {X:nom}.") },
      { id: "job_work_as", s: t("I | work | as | {X.np}.", "Aš | dirbu | — | {X.np:ins}.", "Dirbu {X:ins}.", { flags: { 2: F_AS } }) },
      { id: "job_im", s: t("I'm | {X.np} | with | ten | years | of | experience.", "Aš esu | {X.np:nom} | su | dešimties | metų | — | patirtimi.",
        "Esu {X:nom}, turiu dešimties metų patirtį.", { flags: { 5: F_OF_YEARS } }) },
      { id: "job_been", s: t("I've | been | {X.np} | for | five | years.", "Aš | esu | {X.np:nom} | — | penkerius | metus.", "Jau penkerius metus esu {X:nom}.",
        { flags: { 0: F_VE, 3: F_DUR } }) },
      { id: "job_was", s: t("I | worked | as | {X.np} | in Lithuania.", "Aš | dirbau | — | {X.np:ins} | Lietuvoje.", "Lietuvoje dirbau {X:ins}.", { flags: { 2: F_AS } }) },
    ],
  };
}

function strengthGroup() {
  const adj = (e: EntityDef) => e.attrs?.kind === "adj";
  return {
    lt: "Pasakyti savo stiprybes", slot: "strength", examples: ["organized", "reliable", "team_player", "patient"],
    items: [
      { id: "s_very", s: t("I'm | very | {X}.", "Aš esu | labai | {X:nom}.", "Esu labai {X:nom}."), only: adj },
      { id: "s_very", s: t("I'm | {X.np}.", "Aš esu | {X.np:nom}.", "Esu {X:nom}."), only: (e: EntityDef) => !adj(e) },
      { id: "learn_fast", s: t("I | learn | fast.", "Aš | mokausi | greitai.", "Greitai mokausi.") },
      { id: "s_say", s: t("I'd | say | I'm | {X}.", "Aš | sakyčiau, | aš esu | {X:nom}.", "Sakyčiau, esu {X:nom}.", { flags: { 0: F_ID } }), only: adj },
      { id: "s_people", s: t("People | say | I'm | {X}.", "Žmonės | sako, | kad aš esu | {X:nom}.", "Žmonės sako, kad esu {X:nom}."), only: adj },
      { id: "s_people", s: t("People | say | I'm | {X.np}.", "Žmonės | sako, | kad aš esu | {X.np:nom}.", "Žmonės sako, kad esu {X:nom}."), only: (e: EntityDef) => !adj(e) },
    ],
  };
}

// ---------------------------------------------------------------------------
// Handler helpers (hoisted function declarations)

function arrived(c: Ctx) {
  c.s.arrived = true;
  if (c.s.named) welcome(c);
}

function named(c: Ctx, name?: string) {
  if (!name) return;
  const first = !c.s.named;
  c.s.named = true;
  if (first && c.s.arrived) welcome(c);
}

function welcome(c: Ctx) {
  if (c.s.welcomed) return;
  c.s.welcomed = true;
  c.say("welcome");
  c.say("sit");
}

function giveDrink(c: Ctx, coffee: boolean) {
  if (coffee) { c.say("here_coffee"); c.event("give", { item: "coffee" }); }
  else { c.say("here_water"); c.event("give", { item: "water" }); }
}

function setJob(c: Ctx, id: string) {
  me(c).job = id;
  if (id === "student") me(c).student = true;
}

/** Years of experience from a {dur} or "since {year}" slot. */
function readExp(c: Ctx, slots: any, seg: { tags: string[] }) {
  const d = toArr(slots.dur)[0];
  if (typeof d === "number") me(c).years = d;
  else if (typeof slots.year === "number" && slots.year <= THIS_YEAR) me(c).years = THIS_YEAR - slots.year;
  else if (seg.tags.includes("many")) me(c).years = 10;
}

/** What the learner said about themselves: the best reaction of the turn is said before the next question
 *  (one answer often arrives in several segments: "I work in logistics. About twelve years."). */
function aboutAck(c: Ctx, slots: any) {
  c.s.aboutInfo = (c.s.aboutInfo || 0) + 1;
  const d = turn(c);
  const yrs = toArr(slots.dur)[0] ?? (slots.year ? THIS_YEAR - slots.year : undefined);
  const cand: [number, string, Record<string, any>?][] = [];
  if (typeof yrs === "number" && yrs >= 10) cand.push([4, "exp_lot"]);
  if (slots.job && slots.job !== "student") cand.push([3, "job_echo", { X: slots.job }]);
  if (typeof yrs === "number" && yrs >= 2) cand.push([2, "exp_good"]);
  cand.push([1, "about_ack"]);
  const best = cand[0];
  if (!d.aboutAck || d.aboutAck[0] < best[0]) d.aboutAck = best;
}
/** All the extra questions picked for this visit are answered (or no longer apply after "about"). */
function extrasDone(c: Ctx): boolean {
  return (c.s.qs || []).every((id: string) => {
    const st = interview.steps.find((x) => x.id === id);
    if (!st) return true;
    if (st.done(c)) return true;
    return aboutDone(c) && !!st.when && !st.when(c);
  });
}

/** Say the reaction collected this turn (called before every question and at the end). */
function flush(c: Ctx) {
  const d = turn(c);
  if (d.aboutAck && !d.acked) { d.acked = true; c.say(d.aboutAck[1], d.aboutAck[2]); }
  d.aboutAck = null;
}

/** "Tell me about yourself", then only what is still missing. */
function askAbout(c: Ctx) {
  const m = me(c);
  const n = c.s.aboutAsks++;
  const kind = n === 0 ? "open" : !aboutKnown(c) && m.grad ? "studied" : !aboutKnown(c) ? (c.s.aboutKind === "open" && !c.s.aboutInfo ? "open" : "job") : "years";
  // the same question again (after a side move) is a stall; new information resets it
  c.s.aboutStall = kind === c.s.aboutKind && c.s.aboutInfo === c.s.aboutInfoAtAsk ? (c.s.aboutStall || 0) + 1 : 0;
  c.s.aboutKind = kind;
  c.s.aboutInfoAtAsk = c.s.aboutInfo;
  if (kind === "open") {
    c.say(n === 0 ? "ask_about" : "ask_about_again");
  } else if (kind === "studied") {
    c.s.studiedAsked = true;
    c.say("ask_studied");
  } else if (kind === "job") {
    c.say(m.between ? "ask_job_before" : "ask_job_more");
  } else {
    if (m.job) c.say("ask_years_job", { X: m.job });
    else if (m.field) c.say(fieldMulti(m.field) ? "ask_years_field2" : "ask_years_field", { X: m.field });
    else c.say("ask_years_generic");
  }
  // the corridor follows the question just asked (a one-turn pending question carries it)
  const sg = kind === "years" ? [S_YEARS, S_JOB] : kind === "studied" ? [S_STUDIED, S_ABOUT_MORE] : kind === "job" ? [S_JOB, S_FIELD] : [S_JOB, S_FIELD, S_ABOUT_MORE];
  c.expect({ id: "about", optional: true, expects: ABOUT_INTENTS, suggest: sg, hints: sg.map((x) => x.hint!) });
}

function strengthAnswer(c: Ctx, ids: string[], tags: string[]) {
  c.s.strengths = [...(c.s.strengths || []), ...ids];
  const step = c.step;
  // "Why here?" → "I'm hardworking and good with people": the strengths are told too (no second question)
  if (step === "why") { c.s.done.why = true; if (ids.length) c.s.done.strengths = true; ackOnce(c, "why_ack"); return; }
  if (step === "hire") { c.s.done.hire = true; ackOnce(c, "hire_ack"); return; }
  if (step === "teamwork") { c.s.done.teamwork = true; ackOnce(c, "teamwork_ack"); return; }
  if (step === "strengths" || step === "about") c.s.done.strengths = true;
  const first = ids[0];
  if (turn(c).acked) return;
  if (first === "team_player" || tags.includes("team")) ackOnce(c, "s_team");
  else if (first === "fast_learner" || tags.includes("fast_learner")) ackOnce(c, "s_fast");
  else if (tags.includes("good_with") || first === "friendly" || first === "communicator") ackOnce(c, "s_people");
  else if (first === "organized") ackOnce(c, "s_organized");
  else ackOnce(c, "strength_ack");
}

function markWeakness(c: Ctx) {
  c.s.done.weakness = true;
  const d = turn(c);
  if (d.acked) return;
  // The follow-up ("And how are you working on that?") comes only when the learner didn't say it already.
  const improving = /\b(but|working on|learning|improving|getting better|taking|practic)/.test(heard(c));
  if (c.s.englishWeak && improving) { ackOnce(c, "english_ack"); return; }
  if (c.s.improveQ && !improving && !c.s.improveAsked) {
    c.s.improveAsked = true;
    d.acked = true;
    c.say("ask_improve");
    c.expect({ id: "improve", optional: true, expects: ["working_on_it"], hints: ["improve"],
      suggest: [{ lt: "Pasakyti, kaip tai tobulini", hint: "improve" }],
      on: { working_on_it: (cc) => { cc.say(cc.s.englishWeak ? "english_ack" : "improve_ack"); }, g_dontknow: (cc) => { cc.say("no_team_ack"); } } });
    return;
  }
  ackOnce(c, c.s.englishWeak ? "english_ack" : "weakness_ack");
}

function noWeakness(c: Ctx) {
  if (c.step !== "weakness") { c.say("ack"); return; }
  if (c.s.done.weakness) { c.say("no_team_ack"); return; }
  if (!c.s.noWeakOnce) {
    c.s.noWeakOnce = true;
    c.say("no_weak_1");
    c.say("ask_improve_what");
    c.hold();
    return;
  }
  c.s.done.weakness = true;
  c.say("no_weak_2");
}

function languages(c: Ctx, n: number, many: boolean) {
  c.s.done.languages = true;
  ackOnce(c, n >= 3 || many ? "languages_wow" : "languages_ack");
}

function countQuestion(c: Ctx) {
  c.s.qCount = (c.s.qCount || 0) + 1;
  if (c.s.qAsked && c.s.qCount >= 4 && !c.s.qDone) { c.s.qDone = true; c.say("great_questions"); }
}

function answerQ(c: Ctx, key: string, say: () => void) {
  if (c.s.asked[key] && key !== "unknown") { say(); return; }
  c.s.asked[key] = true;
  say();
  countQuestion(c);
}

function offerYes(c: Ctx) {
  c.say("offer_yes");
  c.say("offer_contract");
  c.remember({ hired: true });
  closeUp(c, true);
}

function closeUp(c: Ctx, hired: boolean) {
  void hired;
  c.complete();
  const reply = (cc: Ctx, line = "closing_reply") => { if (!turn(cc).closed) { turn(cc).closed = true; cc.say(line); } cc.end(); };
  c.expect({ id: "closing", hints: ["closing"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "closing" }],
    on: {
      thanks_time: (cc) => reply(cc), look_forward: (cc) => reply(cc, "closing_bye"), nice_meet: (cc) => reply(cc, "closing_nice"),
      g_thanks: (cc) => reply(cc), accept_job: (cc) => reply(cc), g_bye: (cc) => reply(cc, "g_bye"),
    },
    yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
}

// Every question first says the reaction collected from the learner's last answer.
for (const st of interview.steps) { const ask = st.ask; st.ask = (c) => { flush(c); ask(c); }; }

export default interview;
