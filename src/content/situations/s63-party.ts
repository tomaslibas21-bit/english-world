// Song 63 "So, Where Are You From?": small talk at Sophie's party.
// Sophie opens ("Hi! So glad you came! Come meet Mark!"), then Mark and the learner get to know
// each other: names, how they know Sophie, where they are from, what they do, how long they have
// been in Maple Harbor, whether they like it, what they do for fun, another drink, "Oh, look at the
// time!", swapping numbers and goodbye. Reciprocity matters: Mark asks, the learner answers and
// can ask back ("And you?"), and Mark answers about himself. If the learner never asks anything,
// Mark eventually says "I've been asking all the questions! Your turn."
// Twists (some visits): Mark mishears the country (Latvia for Lithuania …); "Have you been to the
// new café on the corner?".
//
// Sophie and Mark are informal (tu). Mark is a chef from Chicago who moved here in May and can't
// dance.
//
// Jobs: the player's job uses masculine forms plus `ltF` feminine forms, which the engine picks by the
// player's gender ("Aš esu slaugytoja"); Mark's own lines use the separate masculine list.

import type { Ctx, EntityDef, Pending, SituationDef } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Lithuanian declension helpers (regular nouns only; irregular forms are written out)

function declM(nom: string): string[] {
  const x = (n: number) => nom.slice(0, -n);
  if (nom.endsWith("ius")) return [nom, x(3) + "iaus", x(3) + "iui", x(3) + "ių", x(3) + "iumi", x(3) + "iuje"];
  if (nom.endsWith("ys")) return [nom, x(2) + "io", x(2) + "iui", x(2) + "į", x(2) + "iu", x(2) + "yje"];
  if (nom.endsWith("is")) return [nom, x(2) + "io", x(2) + "iui", x(2) + "į", x(2) + "iu", x(2) + "yje"];
  if (nom.endsWith("jas")) return [nom, x(2) + "o", x(2) + "ui", x(2) + "ą", x(2) + "u", x(2) + "uje"];
  if (nom.endsWith("as")) return [nom, x(2) + "o", x(2) + "ui", x(2) + "ą", x(2) + "u", x(2) + "e"];
  if (nom.endsWith("ė")) return [nom, x(1) + "ės", x(1) + "ei", x(1) + "ę", x(1) + "e", x(1) + "ėje"];
  if (nom.endsWith("a")) return [nom, x(1) + "os", x(1) + "ai", x(1) + "ą", x(1) + "a", x(1) + "oje"];
  return [nom, nom, nom, nom, nom, nom];
}
function declF(nom: string): string[] {
  const x = nom.slice(0, -1);
  if (nom.endsWith("ė")) return [nom, x + "ės", x + "ei", x + "ę", x + "e", x + "ėje"];
  if (nom.endsWith("a")) return [nom, x + "os", x + "ai", x + "ą", x + "a", x + "oje"];
  return [nom, nom, nom, nom, nom, nom];
}
const forms6 = (f: string[]) => f.join("/");
/** Length of the shared noun stem ("slaugytoj-as" / "slaugytoj-a" → 9). */
function stemLen(m: string, f: string): number {
  const stemOf = (w: string) => { for (const e of ["ius", "ys", "is", "as", "ė", "a"]) if (w.endsWith(e)) return w.slice(0, -e.length); return w; };
  const a = stemOf(m), b = stemOf(f);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}
/** Dictionary style for both genders: "slaugytojas (-a)", "slaugytojo (-os)". */
function both(m: string, f: string): string {
  if (m === f) return forms6(declM(m));
  const M = declM(m), F = declF(f), n = stemLen(m, f);
  return M.map((mf, i) => `${mf} (-${F[i].slice(n)})`).join("/");
}

// ---------------------------------------------------------------------------
// Jobs: [id, English units, Lithuanian first unit (fixed, for two-word jobs) | "", masc. nom, fem. nom, synonyms]

type JobRow = [string, string, string, string, string, string[]];
const JOB_ROWS: JobRow[] = [
  ["nurse", "nurse", "", "slaugytojas", "slaugytoja", ["registered nurse"]],
  ["doctor", "doctor", "", "gydytojas", "gydytoja", ["physician", "family doctor", "gp", "surgeon"]],
  ["teacher", "teacher", "", "mokytojas", "mokytoja", ["school teacher", "english teacher", "math teacher", "kindergarten teacher"]],
  ["engineer", "engineer", "", "inžinierius", "inžinierė", ["civil engineer", "mechanical engineer"]],
  ["developer", "software | developer", "programinės įrangos", "kūrėjas", "kūrėja", ["programmer", "developer", "software engineer", "web developer", "coder"]],
  ["it_specialist", "IT | specialist", "IT", "specialistas", "specialistė", ["it specialist", "i t specialist", "it guy", "system administrator", "it support"]],
  ["accountant", "accountant", "", "buhalteris", "buhalterė", ["bookkeeper"]],
  ["manager", "manager", "", "vadovas", "vadovė", ["office manager", "team leader", "team lead", "store manager", "boss"]],
  ["project_manager", "project | manager", "projektų", "vadovas", "vadovė", ["project managers", "product manager"]],
  ["salesperson", "salesperson", "", "pardavėjas", "pardavėja", ["sales assistant", "shop assistant", "salesman", "saleswoman", "sales clerk", "sales rep", "sales representative"]],
  ["cashier", "cashier", "", "kasininkas", "kasininkė", ["checkout operator"]],
  ["chef", "chef", "", "virėjas", "virėja", ["cook"]],
  ["waiter", "waiter", "", "padavėjas", "padavėja", ["waitress", "server"]],
  ["bartender", "bartender", "", "barmenas", "barmenė", ["barman"]],
  ["barista", "barista", "", "barista", "barista", []],
  ["driver", "driver", "", "vairuotojas", "vairuotoja", ["truck driver", "bus driver", "taxi driver", "delivery driver", "uber driver"]],
  ["mechanic", "mechanic", "", "mechanikas", "mechanikė", ["car mechanic"]],
  ["electrician", "electrician", "", "elektrikas", "elektrikė", []],
  ["plumber", "plumber", "", "santechnikas", "santechnikė", []],
  ["builder", "builder", "", "statybininkas", "statybininkė", ["construction worker"]],
  ["carpenter", "carpenter", "", "dailidė", "dailidė", ["joiner"]],
  ["farmer", "farmer", "", "ūkininkas", "ūkininkė", []],
  ["lawyer", "lawyer", "", "teisininkas", "teisininkė", ["attorney", "solicitor"]],
  ["police_officer", "police | officer", "policijos", "pareigūnas", "pareigūnė", ["policeman", "policewoman", "cop"]],
  ["firefighter", "firefighter", "", "ugniagesys", "ugniagesė", ["fireman"]],
  ["pharmacist", "pharmacist", "", "vaistininkas", "vaistininkė", []],
  ["dentist", "dentist", "", "odontologas", "odontologė", []],
  ["vet", "vet", "", "veterinaras", "veterinarė", ["veterinarian"]],
  ["architect", "architect", "", "architektas", "architektė", []],
  ["designer", "designer", "", "dizaineris", "dizainerė", ["graphic designer", "web designer", "interior designer"]],
  ["photographer", "photographer", "", "fotografas", "fotografė", []],
  ["journalist", "journalist", "", "žurnalistas", "žurnalistė", ["reporter"]],
  ["writer", "writer", "", "rašytojas", "rašytoja", ["author"]],
  ["translator", "translator", "", "vertėjas", "vertėja", ["interpreter"]],
  ["hairdresser", "hairdresser", "", "kirpėjas", "kirpėja", ["hairstylist", "hair stylist", "barber"]],
  ["cleaner", "cleaner", "", "valytojas", "valytoja", ["janitor", "housekeeper"]],
  ["student", "student", "", "studentas", "studentė", ["university student", "college student"]],
  ["scientist", "scientist", "", "mokslininkas", "mokslininkė", ["researcher"]],
  ["musician", "musician", "", "muzikantas", "muzikantė", []],
  ["artist", "artist", "", "menininkas", "menininkė", ["painter"]],
  ["receptionist", "receptionist", "", "administratorius", "administratorė", ["secretary", "office administrator", "admin assistant"]],
  ["banker", "banker", "", "bankininkas", "bankininkė", ["bank teller", "bank clerk"]],
  ["psychologist", "psychologist", "", "psichologas", "psichologė", ["therapist"]],
  ["entrepreneur", "entrepreneur", "", "verslininkas", "verslininkė", ["business owner", "businessman", "businesswoman"]],
  ["factory_worker", "factory | worker", "gamyklos", "darbininkas", "darbininkė", ["factory worker"]],
  ["pilot", "pilot", "", "pilotas", "pilotė", []],
  ["baker", "baker", "", "kepėjas", "kepėja", []],
  ["tour_guide", "tour | guide", "ekskursijų", "gidas", "gidė", ["guide", "tourist guide"]],
  ["nanny", "nanny", "", "auklė", "auklė", ["babysitter"]],
  ["economist", "economist", "", "ekonomistas", "ekonomistė", ["analyst", "financial analyst"]],
];

function jobEntity(r: JobRow, which: "both" | "m" | "f"): EntityDef {
  const [id, en, first, m, f, syn] = r;
  if (which === "both" && m !== f) {
    // the player's job: masculine forms, plus feminine forms the engine uses for a female player
    const withFirst = (h: string) => (first ? `${first} | ${h}` : h);
    return ent(id, en, withFirst(forms6(declM(m))), "m", { forms: syn, ltF: withFirst(forms6(declF(f))) });
  }
  const head = which === "both" ? both(m, f) : forms6(which === "m" ? declM(m) : declF(f));
  const lt = first ? `${first} | ${head}` : head;
  const g = which === "f" ? "f" : "m";
  const both1 = m === f ? m : `${m} (-${f.slice(stemLen(m, f))})`;
  const chip = which === "both" ? (first ? `${first} ${both1}` : both1) : undefined;
  return ent(which === "both" ? id : `${which}_${id}`, en, lt, g, { forms: which === "both" ? syn : [], chip });
}

const JOBS = JOB_ROWS.map((r) => jobEntity(r, "both"));
const JOBS_M = JOB_ROWS.map((r) => jobEntity(r, "m"));
const JOBS_F = JOB_ROWS.map((r) => jobEntity(r, "f"));

// Workplaces and fields ("I work in a hospital / in IT")
const FIELDS: EntityDef[] = [
  ["hospital", "hospital", "ligoninė"], ["bank", "bank", "bankas"], ["school", "school", "mokykla"], ["office", "office", "biuras"],
  ["restaurant", "restaurant", "restoranas"], ["hotel", "hotel", "viešbutis"], ["factory", "factory", "gamykla"], ["store", "store", "parduotuvė"],
  ["it", "IT", "IT sritis"], ["marketing", "marketing", "rinkodara"], ["sales", "sales", "pardavimai"], ["tourism", "tourism", "turizmas"],
  ["construction", "construction", "statybos"], ["education", "education", "švietimas"], ["healthcare", "healthcare", "sveikatos priežiūra"],
  ["finance", "finance", "finansai"], ["logistics", "logistics", "logistika"], ["university", "university", "universitetas"],
  ["cafe", "café", "kavinė"], ["lab", "lab", "laboratorija"], ["warehouse", "warehouse", "sandėlis"],
].map(([id, en, lt]) => ent(id, en, forms6(lt.includes(" ") ? [lt, lt, lt, lt, lt, lt] : lt.endsWith("ai") || lt.endsWith("os") ? [lt, lt, lt, lt, lt, lt] : declM(lt)), "m",
  { forms: id === "it" ? ["i t", "information technology", "tech", "computers"] : id === "store" ? ["shop", "supermarket", "grocery store"] : id === "office" ? ["an office", "offices"] : id === "cafe" ? ["cafe", "coffee shop"] : id === "lab" ? ["laboratory"] : id === "healthcare" ? ["health care", "medicine"] : [] }));

// ---------------------------------------------------------------------------
// Countries and Lithuanian cities

const CTRY = (id: string, en: string, lt: string, forms: string[] = [], g: "m" | "f" = "f", ltFull?: string) =>
  ent(id, en, ltFull ?? forms6(g === "f" ? declF(lt) : declM(lt)), g, { forms, chip: lt.split("/")[0] });
const COUNTRIES: EntityDef[] = [
  CTRY("lithuania", "Lithuania", "Lietuva", ["lithuanian", "lietuva", "lituania"]),
  CTRY("latvia", "Latvia", "Latvija", ["latvian"]),
  CTRY("estonia", "Estonia", "Estija", ["estonian"]),
  CTRY("poland", "Poland", "Lenkija", ["polish"]),
  CTRY("germany", "Germany", "Vokietija", ["german"]),
  CTRY("ukraine", "Ukraine", "Ukraina", ["ukrainian", "the ukraine"]),
  CTRY("belarus", "Belarus", "Baltarusija", ["belarusian", "byelorussia"]),
  CTRY("russia", "Russia", "Rusija", ["russian"]),
  CTRY("sweden", "Sweden", "Švedija", ["swedish"]),
  CTRY("norway", "Norway", "Norvegija", ["norwegian"]),
  CTRY("finland", "Finland", "Suomija", ["finnish"]),
  CTRY("denmark", "Denmark", "Danija", ["danish"]),
  CTRY("england", "England", "Anglija", ["english", "london"]),
  ent("uk", "the | UK", "— | Jungtinė Karalystė/Jungtinės Karalystės/Jungtinei Karalystei/Jungtinę Karalystę/Jungtine Karalyste/Jungtinėje Karalystėje", "f",
    { forms: ["uk", "u k", "united kingdom", "the united kingdom", "britain", "great britain", "british"], chip: "Jungtinė Karalystė" }),
  CTRY("ireland", "Ireland", "Airija", ["irish"]),
  CTRY("scotland", "Scotland", "Škotija", ["scottish"]),
  CTRY("france", "France", "Prancūzija", ["french"]),
  CTRY("spain", "Spain", "Ispanija", ["spanish"]),
  CTRY("italy", "Italy", "Italija", ["italian"]),
  CTRY("portugal", "Portugal", "Portugalija", ["portuguese"]),
  CTRY("greece", "Greece", "Graikija", ["greek"]),
  ent("netherlands", "the | Netherlands", "— | Nyderlandai/Nyderlandų/Nyderlandams/Nyderlandus/Nyderlandais/Nyderlanduose", "m",
    { forms: ["netherlands", "holland", "dutch"], chip: "Nyderlandai" }),
  CTRY("belgium", "Belgium", "Belgija", ["belgian"]),
  CTRY("switzerland", "Switzerland", "Šveicarija", ["swiss"]),
  CTRY("austria", "Austria", "Austrija", ["austrian"]),
  CTRY("czechia", "Czechia", "Čekija", ["czech republic", "the czech republic", "czech"]),
  CTRY("slovakia", "Slovakia", "Slovakija", ["slovak"]),
  CTRY("slovenia", "Slovenia", "Slovėnija", ["slovenian"]),
  CTRY("croatia", "Croatia", "Kroatija", ["croatian"]),
  CTRY("hungary", "Hungary", "Vengrija", ["hungarian"]),
  CTRY("romania", "Romania", "Rumunija", ["romanian"]),
  CTRY("bulgaria", "Bulgaria", "Bulgarija", ["bulgarian"]),
  CTRY("iceland", "Iceland", "Islandija", ["icelandic"]),
  CTRY("moldova", "Moldova", "Moldova", ["moldovan"]),
  CTRY("armenia", "Armenia", "Armėnija", ["armenian"]),
  CTRY("canada", "Canada", "Kanada", ["canadian"]),
  CTRY("mexico", "Mexico", "Meksika", ["mexican"]),
  CTRY("brazil", "Brazil", "Brazilija", ["brazilian"]),
  CTRY("argentina", "Argentina", "Argentina", ["argentinian", "argentinean"]),
  CTRY("china", "China", "Kinija", ["chinese"]),
  CTRY("japan", "Japan", "Japonija", ["japanese"]),
  CTRY("india", "India", "Indija", ["indian"]),
  CTRY("turkey", "Turkey", "Turkija", ["turkish", "turkiye"]),
  CTRY("australia", "Australia", "Australija", ["australian"]),
  CTRY("israel", "Israel", "Izraelis", ["israeli"], "m"),
  CTRY("egypt", "Egypt", "Egiptas", ["egyptian"], "m"),
  ent("usa", "the | US", "— | JAV", "f", { forms: ["us", "u s", "usa", "u s a", "america", "the states", "united states", "the united states", "american"], chip: "JAV" }),
];
const byCountry = (id: string) => COUNTRIES.find((e) => e.id === id)!;
const NATIONALITIES = Object.entries({
  lithuania: ["lithuanian"], latvia: ["latvian"], estonia: ["estonian"], poland: ["polish"], germany: ["german"], ukraine: ["ukrainian"],
  belarus: ["belarusian"], russia: ["russian"], sweden: ["swedish"], norway: ["norwegian"], finland: ["finnish"], denmark: ["danish"],
  england: ["english"], uk: ["british"], ireland: ["irish"], scotland: ["scottish"], france: ["french"], spain: ["spanish"], italy: ["italian"],
  portugal: ["portuguese"], greece: ["greek"], netherlands: ["dutch"], belgium: ["belgian"], switzerland: ["swiss"], austria: ["austrian"],
  czechia: ["czech"], slovakia: ["slovak", "slovakian"], slovenia: ["slovenian"], croatia: ["croatian"], hungary: ["hungarian"], romania: ["romanian"],
  bulgaria: ["bulgarian"], iceland: ["icelandic"], moldova: ["moldovan"], armenia: ["armenian"], canada: ["canadian"], mexico: ["mexican"],
  brazil: ["brazilian"], argentina: ["argentinian", "argentinean"], china: ["chinese"], japan: ["japanese"], india: ["indian"], turkey: ["turkish"],
  australia: ["australian"], israel: ["israeli"], egypt: ["egyptian"], usa: ["american"],
}).map(([id, forms]) => ({ id, forms }));
/** Countries that sound alike (the mishearing twist). */
const MISHEAR: Record<string, string> = {
  lithuania: "latvia", latvia: "lithuania", austria: "australia", australia: "austria", sweden: "switzerland", switzerland: "sweden",
  slovakia: "slovenia", slovenia: "slovakia", iceland: "ireland", ireland: "iceland", poland: "netherlands",
};

const CITY = (id: string, en: string, lt: string, forms: string[], g: "m" | "f" = "m") => ent(id, en, lt, g, { forms, chip: lt.split("/")[0], attrs: { country: "lithuania" } });
const CITIES: EntityDef[] = [
  CITY("vilnius", "Vilnius", "Vilnius/Vilniaus/Vilniui/Vilnių/Vilniumi/Vilniuje", ["vilna"]),
  CITY("kaunas", "Kaunas", "Kaunas/Kauno/Kaunui/Kauną/Kaunu/Kaune", ["kovno"]),
  CITY("klaipeda", "Klaipėda", "Klaipėda/Klaipėdos/Klaipėdai/Klaipėdą/Klaipėda/Klaipėdoje", ["klaipeda", "klaipada", "memel"], "f"),
  CITY("siauliai", "Šiauliai", "Šiauliai/Šiaulių/Šiauliams/Šiaulius/Šiauliais/Šiauliuose", ["siauliai", "shiauliai", "shauliai"]),
  CITY("panevezys", "Panevėžys", "Panevėžys/Panevėžio/Panevėžiui/Panevėžį/Panevėžiu/Panevėžyje", ["panevezys", "panevezhys"]),
  CITY("palanga", "Palanga", "Palanga/Palangos/Palangai/Palangą/Palanga/Palangoje", [], "f"),
  CITY("alytus", "Alytus", "Alytus/Alytaus/Alytui/Alytų/Alytumi/Alytuje", []),
  CITY("marijampole", "Marijampolė", "Marijampolė/Marijampolės/Marijampolei/Marijampolę/Marijampole/Marijampolėje", ["marijampole"], "f"),
  CITY("utena", "Utena", "Utena/Utenos/Utenai/Uteną/Utena/Utenoje", [], "f"),
];

// ---------------------------------------------------------------------------
// Hobbies. kind: "act" (I like …), "play" (I play …), "instr" (I play the …); verbs: "I run, I read …"

type HobRow = [string, string, string, "m" | "f", "act" | "play" | "instr", string[], string[]];
const HOB_ROWS: HobRow[] = [
  ["running", "running", forms6(declM("bėgiojimas")), "m", "act", ["jogging"], ["run", "jog", "go running", "go jogging"]],
  ["reading", "reading", forms6(declM("skaitymas")), "m", "act", ["books", "reading books"], ["read", "read books"]],
  ["cooking", "cooking", "maisto gaminimas/maisto gaminimo/maisto gaminimui/maisto gaminimą/maisto gaminimu/maisto gaminime", "m", "act", [], ["cook"]],
  ["baking", "baking", forms6(declM("kepimas")), "m", "act", [], ["bake"]],
  ["hiking", "hiking", "žygiai/žygių/žygiams/žygius/žygiais/žygiuose", "m", "act", ["trekking", "mountains", "the mountains"], ["hike", "go hiking", "go for a hike", "go to the mountains"]],
  ["walking", "walking", "pasivaikščiojimai/pasivaikščiojimų/pasivaikščiojimams/pasivaikščiojimus/pasivaikščiojimais/pasivaikščiojimuose", "m", "act", ["walks", "long walks", "nordic walking"], ["walk", "go for walks", "take walks", "walk my dog", "walk the dog", "walk with my dog", "walk with the dog", "go for a walk", "go for walks with my dog"]],
  ["swimming", "swimming", forms6(declM("plaukimas")), "m", "act", ["the pool"], ["swim", "go swimming", "swim in the sea", "swim in the lake", "go to the pool"]],
  ["cycling", "cycling", "važinėjimas dviračiu/važinėjimo dviračiu/važinėjimui dviračiu/važinėjimą dviračiu/važinėjimu dviračiu/važinėjime dviračiu", "m", "act", ["biking", "bike riding", "bicycle", "riding my bike"], ["bike", "cycle", "ride my bike", "ride a bike", "go biking", "go cycling", "ride my bicycle", "ride a bicycle"]],
  ["dancing", "dancing", "šokiai/šokių/šokiams/šokius/šokiais/šokiuose", "m", "act", [], ["dance", "go dancing"]],
  ["yoga", "yoga", forms6(declF("joga")), "f", "act", [], ["do yoga"]],
  ["fitness", "fitness", "sportas/sporto/sportui/sportą/sportu/sporte", "m", "act", ["working out", "the gym", "going to the gym", "exercise", "sports", "sport"], ["work out", "go to the gym", "exercise"]],
  ["fishing", "fishing", forms6(declF("žvejyba")), "f", "act", [], ["fish", "go fishing"]],
  ["gardening", "gardening", forms6(declF("sodininkystė")), "f", "act", ["my garden", "the garden"], ["garden", "work in the garden", "grow vegetables", "grow flowers", "have a garden", "have a big garden", "work in my garden"]],
  ["painting", "painting", forms6(declF("tapyba")), "f", "act", [], ["paint"]],
  ["drawing", "drawing", forms6(declM("piešimas")), "m", "act", [], ["draw"]],
  ["photography", "photography", forms6(declF("fotografija")), "f", "act", ["taking photos", "taking pictures", "photos"], ["take photos", "take pictures"]],
  ["music", "music", forms6(declF("muzika")), "f", "act", ["listening to music"], ["listen to music", "make music"]],
  ["singing", "singing", forms6(declM("dainavimas")), "m", "act", ["choir", "karaoke"], ["sing", "sing in a choir"]],
  ["traveling", "traveling", "kelionės/kelionių/kelionėms/keliones/kelionėmis/kelionėse", "f", "act", ["travelling", "travel"], ["travel"]],
  ["camping", "camping", forms6(declM("stovyklavimas")), "m", "act", [], ["camp", "go camping"]],
  ["knitting", "knitting", forms6(declM("mezgimas")), "m", "act", [], ["knit"]],
  ["movies", "movies", "filmai/filmų/filmams/filmus/filmais/filmuose", "m", "act", ["films", "watching movies", "cinema", "tv series", "series", "watching tv", "netflix", "watching films"], ["watch movies", "go to the movies", "watch films", "watch tv", "watch series", "watch netflix", "go to the cinema"]],
  ["mushrooms", "mushroom | picking", `grybų | ${forms6(declM("rinkimas"))}`, "m", "act", ["picking mushrooms", "mushrooms", "foraging", "mushroom hunting"], ["pick mushrooms", "go mushroom picking", "look for mushrooms"]],
  ["sauna", "sauna", "pirtis/pirties/pirčiai/pirtį/pirtimi/pirtyje", "f", "act", ["the sauna", "saunas"], ["go to the sauna"]],
  ["video_games", "video | games", "kompiuteriniai/kompiuterinių/kompiuteriniams/kompiuterinius/kompiuteriniais/kompiuteriniuose | žaidimai/žaidimų/žaidimams/žaidimus/žaidimais/žaidimuose", "m", "play", ["computer games", "gaming", "games"], ["game"]],
  ["board_games", "board | games", "stalo | žaidimai/žaidimų/žaidimams/žaidimus/žaidimais/žaidimuose", "m", "play", [], []],
  ["chess", "chess", "šachmatai/šachmatų/šachmatams/šachmatus/šachmatais/šachmatuose", "m", "play", [], []],
  ["soccer", "soccer", forms6(declM("futbolas")), "m", "play", ["football"], []],
  ["basketball", "basketball", "krepšinis/krepšinio/krepšiniui/krepšinį/krepšiniu/krepšinyje", "m", "play", [], []],
  ["tennis", "tennis", forms6(declM("tenisas")), "m", "play", ["table tennis", "ping pong"], []],
  ["volleyball", "volleyball", "tinklinis/tinklinio/tinkliniui/tinklinį/tinkliniu/tinklinyje", "m", "play", ["beach volleyball"], []],
  ["golf", "golf", forms6(declM("golfas")), "m", "play", [], []],
  ["guitar", "guitar", forms6(declF("gitara")), "f", "instr", [], []],
  ["piano", "piano", forms6(declM("pianinas")), "m", "instr", ["keyboard"], []],
  ["violin", "violin", forms6(declM("smuikas")), "m", "instr", [], []],
];
const MARK_HOBBIES = ["running", "cooking", "reading"];
const HOBBIES: EntityDef[] = HOB_ROWS.map(([id, en, lt, g, kind, forms]) => ent(id, en, lt, g,
  { forms, art: kind === "instr" ? undefined : "", chip: lt.split("/")[0].replace(" | ", " "), attrs: { kind, mark: MARK_HOBBIES.includes(id) } }));
const HOBBY_VERBS = HOB_ROWS.filter((r) => r[6].length).map(([id, , , , , , verbs]) => ({ id, forms: verbs }));
const byHobby = (id: string) => HOBBIES.find((e) => e.id === id)!;

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const NOW_MONTH = 9; // September
const NOW_YEAR = 2026;

const DRINKS: EntityDef[] = [
  ent("water", "water", "vanduo/vandens/vandeniui/vandenį/vandeniu/vandenyje", "m", { art: "some", forms: ["a glass of water", "water please", "just water"], chip: "vandens" }),
  ent("sparkling", "sparkling | water", "gazuotas/gazuoto/gazuotam/gazuotą/gazuotu/gazuotame | vanduo/vandens/vandeniui/vandenį/vandeniu/vandenyje", "m", { art: "some", forms: ["soda water", "mineral water"], chip: "gazuoto vandens" }),
  ent("lemonade", "lemonade", forms6(declM("limonadas")), "m", { chip: "limonado" }),
  ent("iced_tea", "iced | tea", "šalta/šaltos/šaltai/šaltą/šalta/šaltoje | arbata/arbatos/arbatai/arbatą/arbata/arbatoje", "f", { forms: ["ice tea", "cold tea"], chip: "šaltos arbatos" }),
  ent("soda", "soda", "gazuotas gėrimas/gazuoto gėrimo/gazuotam gėrimui/gazuotą gėrimą/gazuotu gėrimu/gazuotame gėrime", "m", { forms: ["coke", "a coke", "cola", "pop", "sprite"], chip: "gazuoto gėrimo" }),
  ent("beer", "beer", "alus/alaus/alui/alų/alumi/aluje", "m", { chip: "alaus" }),
  ent("wine", "wine", "vynas/vyno/vynui/vyną/vynu/vyne", "m", { art: "some", forms: ["a glass of wine", "red wine", "white wine"], chip: "vyno" }),
  ent("juice", "juice", "sultys/sulčių/sultims/sultis/sultimis/sultyse", "f", { art: "some", forms: ["orange juice", "apple juice"], chip: "sulčių" }),
];

// ---------------------------------------------------------------------------
// Helpers

const F_DO_Q = "Question “Do” = the particle ar.";
const F_DO_WH = "Question “do”: no Lithuanian word; the tense sits on the verb.";
const F_FROM = "Stranded “from”: Lithuanian puts iš before kur (iš kur).";

/** The current learner turn: the engine builds a fresh ctx object for every input, so the same
 *  sentence said on two different turns gets two different keys (c.heard alone would not). */
const turnIds = new WeakMap<object, number>();
let turnSeq = 0;
const turn = (c: Ctx) => { let t = turnIds.get(c); if (t === undefined) { t = ++turnSeq; turnIds.set(c, t); } return `${t}:${c.heard}`; };
const SO = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); c.speaker("sophie"); c.say(line, vars); };
const M = (c: Ctx, line: string, vars?: Record<string, any>) => { c.s.__spokeFor = turn(c); c.speaker("mark"); c.say(line, vars); };
const live = (c: Ctx) => !c.s.byeSaid;
const once = (c: Ctx, key: string) => { const t = turn(c); if (c.s["__once_" + key] === t) return false; c.s["__once_" + key] = t; return true; };
/** Someone already reacted to this utterance (one answer can arrive as several segments). */
const quiet = (c: Ctx) => c.s.__spokeFor === turn(c) && !!c.heard;
/** The learner answered and asked back in one breath ("I'm from Lithuania. And you?"). */
const askedBackToo = (c: Ctx) => /\b(and|how about|what about) (you|yourself)\b|\b(where|what|how|do|are) [a-z ]*\byou\b/i.test(c.heard);
/** Mark's follow-up question waits until he has answered the learner's question. */
function deferOrAsk(c: Ctx, q: (cc: Ctx) => void) {
  if (askedBackToo(c) && !c.s.__deferHeard) { c.s.__deferHeard = c.heard; c.s.deferQ = q; return; }
  q(c);
}
function runDeferred(c: Ctx) {
  const q = c.s.deferQ as ((cc: Ctx) => void) | null;
  if (!q) return;
  c.s.deferQ = null; c.s.__deferHeard = null;
  q(c);
}
const jobVar = (c: Ctx, id: string) => ({ id: `${c.player.gender === "f" ? "f" : "m"}_${id}` });

type Topic = "name" | "know" | "from" | "job" | "time" | "like" | "fun" | "reading" | "cafe" | "live";

/** Mark tells the learner about himself (the learner asked, or asked back with "And you?"). */
function markAbout(c: Ctx, topic: Topic) {
  c.s.askedBack = (c.s.askedBack || 0) + 1;
  if (!once(c, "mark_" + topic)) return;
  c.s.told = c.s.told || {};
  c.s.told[topic] = true;
  switch (topic) {
    case "know": M(c, "mark_know"); c.s.danceTold = true; break;
    case "from": M(c, "mark_from"); break;
    case "job": M(c, "mark_job"); break;
    case "time": M(c, "mark_time"); break;
    case "like": M(c, "mark_like"); break;
    case "fun": M(c, "mark_fun"); break;
    case "reading": M(c, "mark_reading"); break;
    case "live": M(c, "mark_live"); break;
    case "cafe": M(c, "mark_cafe"); break;
    default: M(c, "mark_name");
  }
  if (c.s.deferQ) { runDeferred(c); return; }
  // Asked first by the learner: Mark asks the same question back.
  const stepFor: Partial<Record<Topic, string>> = { know: "know", from: "from", job: "job", time: "time", like: "like", fun: "fun" };
  const st = stepFor[topic];
  if (st && !c.s.done?.[topic] && c.s.lastTopic !== topic && c.s.plan?.includes(st)) {
    c.s.backTopic = topic;
    c.ask(st);
  }
}
/** A topic the learner has answered (and when: "And you?" in the same breath asks about it). */
const done = (c: Ctx, topic: Topic) => { c.s.done = c.s.done || {}; c.s.done[topic] = true; c.s.__toldNow = { t: turn(c), topic }; };
const isDone = (c: Ctx, topic: Topic) => !!c.s.done?.[topic];
const planned = (c: Ctx, step: string) => !!c.s.plan?.includes(step);
/** The goal (= the mission checklist): introduced, from, job (+ Sophie / free time when Mark asks),
 *  asked Mark something back, numbers swapped or politely declined. */
function maybeComplete(c: Ctx) {
  if (!c.s.named || !isDone(c, "from") || !isDone(c, "job")) return;
  if ((planned(c, "know") && !isDone(c, "know")) || (planned(c, "fun") && !isDone(c, "fun"))) return;
  if (!(c.s.askedBack || c.s.turnSkipped) || !c.s.numbersDone) return;
  c.complete();
}
/** A Mark question step: says "And you?" if the learner just asked Mark the same thing. */
function askTopic(c: Ctx, topic: Topic, line: string) {
  c.s.lastTopic = topic;
  if (c.s.backTopic === topic) { c.s.backTopic = null; M(c, "and_you"); return; }
  M(c, line);
}

function reactCountry(c: Ctx, id: string, corrected = false) {
  c.s.country = id;
  done(c, "from");
  if (id === "lithuania") {
    if (!corrected && askedBackToo(c)) M(c, "lithuania_short");
    const sea = (cc: Ctx) => {
      M(cc, corrected || askedBackToo(cc) ? "lithuania_sea" : "lithuania_react");
      cc.expect({
        id: "sea_q", optional: true, expects: ["visit_invite", "confirm_yes"], hints: ["sea"],
        suggest: [{ lt: "Patvirtinti ir pakviesti aplankyti", hint: "sea" }],
        yes: (x) => M(x, "love_to_visit"),
        no: (x) => M(x, "bad_geography"),
        on: { visit_invite: (x) => M(x, "id_love_to"), confirm_yes: (x) => M(x, "love_to_visit") },
      });
    };
    deferOrAsk(c, sea);
    return;
  }
  if (!corrected) M(c, "country_react", { X: id });
}

const AUTO: Record<string, string> = {
  name: "Hi, I'm Tomas. Nice to meet you!",
  drink: "Yes, please. A lemonade would be great.",
  know: "We work together.",
  from: "I'm from Lithuania.",
  sea_q: "Yes, that's right!",
  city_q: "It's in Lithuania.",
  mishear: "No, Lithuania!",
  job: "I'm a nurse.",
  field_q: "I'm a nurse.",
  time: "About a year.",
  like: "Yes, I love it!",
  fun: "I like running and reading.",
  reading: "A funny travel book.",
  basketball_q: "Of course!",
  cafe: "Not yet!",
  cafe_go: "Sure, I'd love to!",
  your_turn: "What do you do for fun?",
  drink2: "No, thanks, I'm fine.",
  numbers: "Sure! Here's mine: 555-0142.",
  ask_number: "It's 555-0142.",
  closing: "It was great to meet you too! See you around!",
};

// ---------------------------------------------------------------------------

export const party: SituationDef = {
  id: "s63-party",
  song: 63,
  songTitle: "So, Where Are You From?",
  title: { en: "So, Where Are You From?", lt: "Tai iš kur tu?" },
  topic: { en: "Meeting new people", lt: "Susipažinimas ir trumpi pokalbiai" },
  chapter: 5,
  order: 1,
  location: "sophies-house",
  npc: "sophie",
  npcs: ["mark"],
  goal: "Susipažink su Marku Sofijos vakarėlyje: prisistatyk, papasakok apie save, paklausk jo ir apsikeiskite numeriais.",
  intro: "Šeštadienio vakaras, vakarėlis Sofijos kieme. Sofija nori tave supažindinti su savo draugu Marku. Papasakok apie save – ir nepamiršk paklausti jo („And you?“).",
  entities: { country: COUNTRIES, city: CITIES, job: JOBS, job_m: JOBS_M, job_f: JOBS_F, field: FIELDS, hobby: HOBBIES, drink: DRINKS },

  grammar: {
    macros: {
      mk: "[mark]",
      so_far: "[so far | here | in maple harbor | in america | here so far]",
      ab: "[(and | so) (you | what about you | how about you | yourself)]",
      freq: "[on (weekends | the weekend | sundays | saturdays) | every (weekend | day | week | morning) | a lot | sometimes | often | in my free time | when i have time]",
      now_here: "[but (i live here now | now i live here | i live in maple harbor now)]",
      when_pre: "(in my free time | on (weekends | the weekend) | in the evenings | after work | when i have time)",
      with_who: "[with (my friends | friends | my kids | my children | my family | my son | my daughter | my husband | my wife | my colleagues | my dog)]",
    },
    slots: {
      hv: { lexicon: HOBBY_VERBS },
      cls: { lexicon: [
        { id: "dance", forms: ["dance", "dancing", "salsa", "tango", "swing", "ballroom"] },
        { id: "yoga", forms: ["yoga", "pilates"] }, { id: "cooking", forms: ["cooking"] }, { id: "english", forms: ["english", "language", "spanish"] },
        { id: "art", forms: ["art", "painting", "pottery", "drawing"] }, { id: "fitness", forms: ["fitness", "gym", "spinning", "zumba"] },
        { id: "music", forms: ["music", "guitar", "piano", "choir"] }, { id: "swimming", forms: ["swimming"] },
      ] },
      month: { lexicon: MONTHS.map((m, i) => ({ id: String(i + 1), forms: [m, m.slice(0, 3)] })) },
      // "I'm Lithuanian": nationality words only (a bare "I'm hungry" must not become Hungary)
      nat: { lexicon: NATIONALITIES },
      hobbies: { pattern: "{hobby} [[and | or | ,] {hobby}] [[and | or] {hobby}]" },
      dur: { pattern: [
        "[about | around | almost | nearly | only | just | over | more than | a little over] {number} (year | years) #y",
        "[about | around | almost | nearly | only | just | over | more than] (a | one) year #y1",
        "[about | around] (a year and a half | one and a half years) #y15",
        "[about | around | almost | nearly | only | just] {number} (month | months) #mo",
        "[about | around | almost | only | just] (a | one) month #mo1",
        "[about | around | almost] (half a year | six months) #mo6",
        "[about | only | just] {number} (week | weeks) #w",
        "[about | only | just] (a | one) week #w1",
        "(a few | a couple of | two or three) (weeks | days) #w",
        "(a few | a couple of | several) months #mofew",
        "(a few | a couple of | several | many) years #yfew",
        "since {month} #since",
        "since last (year | summer | spring | winter) #y1",
        "not (long | very long) #short",
        "(i | we) (just | only just) (moved | arrived | got) [here] #short",
        "(i | we) (moved | came | arrived) [here] (in | last) {month} #since",
        "(i | we) (moved | came | arrived) [here] {number} (months | years | weeks) ago #ago",
        "(i | we) (moved | came | arrived) [here] (a | one) (year | month | week) ago #ago1",
        "(i | we) (moved | came | arrived) [here] last (year | summer | spring | winter | fall) #y1",
        "all my life #life",
        "[about | almost] (one | a) year and a half #y15", "[about] a year and half #y15",
        "(since | in) {year} #yr", "(i | we) (moved | came | arrived) [here] in {year} #yr",
        "(a long time | a long while | ages | many years) #yfew", "since {day} #short", "since (last week | yesterday) #short", "since last month #mo1",
        "(i am | we are) [still] [quite | very | pretty | really] new [here | in town | in maple harbor] #short",
      ] },
    },
  },

  intents: {
    // A bare "I'm …" is a name only with a greeting or "nice to meet you" around it (or at the name step,
    // name_ctx): otherwise "I'm a pensioner", "I'm teacher", "I'm driving" would all become names.
    intro_name: { patterns: [
      "(hi | hello | hey | @greet) [mark] (i am | my name is) {name} [nice to meet you [too]] #h:i_im",
      "[mark] my name is {name} [nice to meet you [too]] #h:i_im",
      "(nice | pleased | glad | happy | good | great) to meet you [too] [mark] (i am | my name is) {name}",
      "(i am | my name is) {name} [and] (nice | pleased | glad | happy | great) to meet you [too]",
      "[@greet] [mark] (call me | you can call me | everyone calls me) {name}",
    ] },
    name_ctx: { patterns: ["{name}", "(it is | i am | this is) {name}", "{name} here", "(call me | you can call me) {name}"] },
    nice_meet: { patterns: [
      "[hi | hello] [mark] nice to meet you [too] [mark] #h:i_nice", "(nice | good | great) (to meet you | meeting you) [too]", "pleasure to meet you", "nice to meet you as well",
      "(it is | it is really | it is so) (nice | great | good | a pleasure) to meet you [too]", "(pleased | glad | happy) to meet you [too]", "(nice | good) meeting you", "the pleasure is mine",
    ] },
    ask_name: { patterns: ["what is your name", "sorry what was your name", "and you are"] },
    // Drinks
    drink_ans: { patterns: [
      "[yes] [can i (have | get) | i will have | i would like | i would love] [a | an | some | a glass of | another | one more] {drink} [would be (great | nice | perfect | lovely)] #h:d_can",
      "[yes] [just] [a | some | a glass of] {drink} [please] #h:d_just",
      "[yes] [a | some] {drink} would be (great | nice | perfect | lovely) #h:d_would",
      "[yes] [a | some | another] {drink} (sounds | would sound) (great | good | perfect | nice | lovely)", "[a | some] {drink} is (fine | good | okay | perfect) [for me]",
      "do you have [any | some] {drink}", "(is there | have you got) [any | some] {drink}", "i will take [a | an | some | a glass of] {drink}", "(maybe | perhaps) [a | an | some] {drink}",
      "(something | anything) (without alcohol | non alcoholic | soft | cold | light) [to drink] [please]", "(a | some) soft drink",
      "i do not drink (alcohol | beer | wine) [so] [just] [a | some | a glass of] {drink}",
      "(anything | whatever you have | whatever) is (fine | good | okay)", "surprise me", "(what | whatever) you are having", "[sure] why not [a | an | some] {drink}",
    ] },
    drink_menu: { patterns: ["what do you have", "what (drinks | kind of drinks) do you have", "what are my options", "what is there", "what (drinks | kind of drinks) (are there | do we have)", "what is there to drink", "what can i (have | get | drink)"] },
    // How they know Sophie
    know_ans: { patterns: [
      "we work together #work #h:k_work",
      "sophie and i (work together | work at the same place) #work",
      "sophie and i are (neighbors | friends | old friends | good friends) #friends",
      "sophie and i met at (a | the | our) {cls} class #class",
      "we (met | know each other) (at | from) work #work",
      "(she is | sophie is) my (colleague | coworker | co worker | boss) #work",
      "i work with (her | sophie) #work",
      "from work #work",
      "we are neighbors #neigh #h:k_neigh",
      "(she is | sophie is) my neighbor #neigh",
      "(she | sophie) lives next door #neigh",
      "i live (next door | on this street | across the street) #neigh",
      "we met at (a | the | our) {cls} class #class #h:k_class",
      "we (take | go to) (a | the same) {cls} class [together] #class",
      "from (a | the | our) {cls} class #class",
      "(we are | we have been) (old | good | best) friends #friends",
      "we are friends #friends",
      "(she is | sophie is) (a | an | my) (friend | good friend | old friend | best friend) [of mine] #friends #h:k_friend",
      "we went to school together #friends",
      "(through | from) a (friend | mutual friend) #friends",
      "a friend (brought | invited) me #friends",
      "(our | my) kids go to the same school #friends",
      "we go to the same (gym | church) #friends",
      "i (do not | ) really know her [yet] #none",
      "i (just | only) met her [today | tonight] #none",
      "we met at [a | the | our] {cls} class #class", "we (take | go to) [a | the] {cls} class together #class",
      "we are (colleagues | coworkers | co workers) #work", "we work (in | at | for) the same (office | company | place | hospital | school | bank | firm | store | restaurant) #work",
      "we used to work together #work", "(she is | sophie is) my (colleague | coworker | co worker) from work #work",
      "[i am] [a] (sophies | sophie s) (colleague | coworker | co worker) [from work] #work",
      "[i am] [a | an] (sophies | sophie s) [old | good | best] friend #friends", "[i am] (sophies | sophie s) neighbor #neigh",
      "(she | sophie) (lives | is living) (next to me | near me | close to me | in my building) #neigh", "we live (on the same street | in the same building | next to each other | close to each other | near each other) #neigh",
      "we (know each other | are friends) from (university | college | school | the gym | church | childhood) #friends",
      "(she is | sophie is) my friend from (school | university | college | the gym | childhood) #friends", "we (studied | went to university | went to college) together #friends",
      "we met (at | in) (the gym | a gym | church | a party | school | university | college | a concert | a bar | the park | a wedding) #friends",
      "i do not know her (very well | well | that well) [yet] #none", "i met her (today | tonight | yesterday | last week | recently) #none", "(this is | it is) my first time here #none",
      "our (kids | children | sons | daughters) are (friends | in the same class) #friends", "our (kids | children) go to the same (school | kindergarten) #friends",
      "(she is | sophie is) my (wifes | husbands | sisters | brothers | friends | cousins) friend #friends", "(through | from) my (husband | wife | partner | friend | sister | brother | cousin) #friends",
      // more ways (played paths): "I don't know anyone here", "I'm her neighbor", "I know her from yoga", "We just met"
      "i do not know (anyone | anybody | many people | a lot of people) [here] [yet] #none", "we (just | only just) met [today | tonight] #none", "i do not know (her | sophie) [at all | yet] #none",
      "i am (her | sophies | sophie s) (neighbor #neigh | colleague #work | coworker #work | co worker #work | friend #friends)", "[i am] a friend of (sophie | sophies | hers) #friends",
      "through work #work", "i know (her | sophie) from (work #work | the office #work | the (gym | church | school | university | college) #friends | the neighborhood #neigh | [a | the | our] {cls} [class] #class)",
      "(we are | i am) in the same {cls} class [together | with her] #class", "we (do | take) {cls} together #class",
      "our (kids | children) (go to (school | kindergarten) together | are classmates) #friends", "(she | sophie) invited me [here | tonight] #friends",
      "we met (last year | last summer | a few years ago | years ago | a long time ago | at a party | at her party) #friends",
      "i met (her | sophie) at work #work", "i met (her | sophie) (at | in) [a | the | our] {cls} class #class",
      "i met (her | sophie) (at | in) (the | a) (cafe | coffee shop | party | bar | concert | park | gym | church | wedding | store | library) #friends",
    ] },
    // Where from
    from_ans: { patterns: [
      "[i am] [originally] from {country} [originally] [by the sea] @now_here #h:fr_from",
      "{country} by the sea",
      "i (come | am) [originally] from {country}",
      "i am [a] {country:nat}",
      "i was born in {country}",
      "i grew up in {country}",
      "[i am] [originally] from {city} [in {country}] #h:fr_city",
      "[i am] [originally] from {city} it is in {country}",
      // other constructions: "my country is …", "a small town in …", "I live here but I'm from …"
      "[i am] [originally] from {city} [it is] (a | the) (city | town) (by | on) the (sea | coast)", "[i am] [originally] from a (small | little | big) (town | village | city) (in | near) {country}",
      "my (country | home country | homeland | home) is {country}", "(i | we) live here [now] but (i am | we are) [originally] from {country}",
      "[i am] [originally] from {country} [from] the capital [city] [{city}]", "[i am] [originally] from {country} [from] {city}", "[i am] [originally] from {city} {country}",
      "[i am] [originally] from {country} it is (in | a country in) (europe | eastern europe | northern europe | the baltics | the baltic states)",
      "[i am] from the (baltics | baltic states | baltic countries) [from] {country}", "i (was born | grew up) in {city} [in {country}]",
      "(i am | we are) from {country} [and] (i | we) (moved | came) here [recently | last year]",
    ] },
    from_ctx: { patterns: ["{country} [originally]", "{city}", "(from | in) {country}", "(from | in) {city}", "{city} [in] {country}", "[from] the (baltics | baltic states) {country}", "i am {country}"] },
    city_country: { patterns: [
      "[it is] (in | near) {country}", "[it is] the capital of {country}", "[it is] a (city | town) in {country}", "[it is] in (the north | the south | the east | the west | the middle) of {country}",
      "[it is] the (second | third | fourth | biggest | largest) [biggest | largest] city (in | of) {country}", "[it is] a (big | small | little | nice) (city | town) in {country} [by the sea]",
      "[it is] (a city | a town) (in | near) {country} (by | on) the (sea | coast)", "[it is] in {country} (by | near | on) the (sea | coast)",
    ] },
    correct_country: { patterns: [
      "[no] not {country} [but] {country} #h:mh_not",
      "no (it is | i said | i am from) {country} #h:mh_no",
      "no {country} [not {country}]",
      "{country} not {country}",
      "no {country} with (an | a) {w:any}",
      "no [no] {country} [it is] (next to | near | close to | south of | north of | not) {country}", "[no] {country} (next to | near) {country}",
    ] },
    confirm_yes: { patterns: [
      "[yes] (that is | it is) (right | correct | true)", "[yes] exactly", "[yes] right on the (sea | coast)", "[yes] (it is | lithuania is) by the sea", "[yes] (you are | you are totally) right", "[yes] that is it",
      "[yes | right] we have (a | the) [beautiful | nice | long | lovely | great] (coast | beach | beaches | sea | seaside)", "[yes] (it is | lithuania is) (on | by) the (baltic sea | baltic | coast)",
      "[yes] (you know | you know your) geography", "[yes] (good | great) guess",
    ] },
    visit_invite: { patterns: [
      "you should (visit | come) [sometime | someday]", "(then | so) you (will | would) have to visit me", "come visit [me] [sometime]", "you are welcome to visit [anytime]", "you would love it",
      "you should (visit | come | go) [there] (in | in the) summer", "you (must | have to) (visit | come) [sometime | one day]", "(visit | come to) (lithuania | us) [sometime | one day]", "it is (beautiful | very nice | lovely) there [in summer]",
    ] },
    // Job
    job_ans: { patterns: [
      "[i am | i work as] (a | an) {job} [here | now] #h:j_im",
      "i work as (a | an) {job} #h:j_work_as",
      "(i am | i work as) (a | an) {job} (at | in) (a | an | the) {field}",
      "[i work | i am working] (in | at) (a | an | the) {field} #field #h:j_field",
      // without the article ("I am teacher"), "like" for "as" (dirbu kaip…), "there"
      "(i am | i work as | i am working as | i am work as) {job} [here | now | there]", "i (work | am working) like [a | an] {job}", "[i am] [a | an] {job} there",
      "(i am | i work as) [a | an] {job} (at | in | for) [a | an | the] [big | small | large | local | private] ({field} | company | firm) [here]",
      "i (work | am working) (in | at | for) [a | an | the] [big | small | large | local | private] (company | firm | {field}) [as [a | an] {job}] #field",
      "my (job | profession | work) is {job}", "my (job | profession) is [a | an] {job}", "(by profession | by trade) i am [a | an] {job}",
      "i drive a (truck | bus | taxi | lorry | van) [for a living] #j:driver", "i teach [english | math | music | history | children | kids | at a school | in a school | at the university] #j:teacher",
      "i (fix | repair) (cars | computers) #j:mechanic", "i cook (in | at) a (restaurant | hotel | cafe) #j:chef", "i (build | am building) houses #j:builder",
      "i (write | develop) (software | code | programs | apps | websites) #j:developer", "i (take care of | look after) (patients | sick people | old people) #j:nurse",
      "i (cut | do) hair #j:hairdresser", "i sell (things | cars | clothes | insurance | houses) #j:salesperson",
      "i do not work [at the moment | right now | now | anymore] #looking", "(at the moment | right now) i do not work #looking", "i am (on | taking) (maternity | parental | sick) leave #home",
      "i am (a pensioner | on (a | my) pension) [now] #retired #tip:us_retired", "i do not work anymore i am retired #retired",
      "i work in {field} #field",
      "i (have | own | run) my own (business | company | shop) #own",
      "i am self employed #own",
      "i am (retired | a retiree) [now] #retired #h:j_retired",
      "i study [at (the | a) university | at college] #student",
      "i am (in college | at university) #student",
      "i am at uni #student #tip:us_college",
      "i am (between jobs | unemployed | out of work) [right now | at the moment] #looking #h:j_looking",
      "i am looking for (a job | work | a new job) [right now | at the moment] #looking",
      "i am a (stay at home | stay home) (mom | dad | parent) #home",
      "i (take care of | look after) my (kids | children | family) #home",
      // what the work is about, without a job title: "I work with computers", "I do marketing"
      "i [mostly] work with (computers | people | children | kids | numbers | money | clients | customers | patients | data | animals | tourists | students) #generic",
      "i do (marketing | sales | accounting | design | graphic design | web design | research | programming | logistics | customer service) #generic",
    ] },
    job_ctx: { patterns: ["[a | an] {job}", "(in | at) (a | an | the) {field}", "[in | at] [a | an | the] {field}"] },
    // How long here
    time_ans: { patterns: [
      "[i have been here | i have lived here | we have been here | i have been in maple harbor | for] [for] {dur} #h:t_dur",
      "{dur} [now]",
      "[about | only] {dur}",
      // "I live here five years" (gyvenu čia penkerius metus), "… already", "Not long, just …"
      "(i | we) (live | am living | are living | living | have been living | lived) here [for | since] {dur} [already | now]", "[for] {dur} already",
      "not (long | very long) [only | just | about] {dur}", "i have been (living | staying) (here | in maple harbor) [for | since] {dur}", "(i | we) came (here | to maple harbor) {dur}",
    ] },
    // Like it
    like_yes: { patterns: [
      "[yes] i (love | like | really like | really love | enjoy) it [a lot] @so_far #h:l_love",
      "[yes] i (love | like | really like | enjoy) it (very much | so much | a lot) @so_far", "[yes] i (love | like | really like) (it here | this town | this place | maple harbor) [very much | a lot]",
      "[yes] it is (a | such a) (beautiful | nice | lovely | great | wonderful | pretty | charming | cute) (town | city | place) [here]",
      "[yes | very much] it is (so | very | really) (quiet | green | peaceful | calm | clean | beautiful | nice | cozy | friendly | relaxing) [and (quiet | green | peaceful | calm | clean | beautiful | nice | friendly)] [here]",
      "[yes | of course] i (love | like | really like) the (ocean | sea | beach | nature | people | town | food | harbor | views) [here]",
      "(it is | it was) better than i (expected | thought)", "[yes] i am (very | so | really) happy here", "[yes] i feel (at home | good | great | happy) here",
      "[yes] it is (great | nice | lovely | amazing | wonderful | beautiful | really nice | fantastic) @so_far",
      "[yes] (people | everyone) (are | is) (so | very | really) (friendly | nice) [here] #h:l_people",
      "[yes] so far so good",
      "[yes] (very much | a lot | definitely)",
    ] },
    like_mixed: { patterns: [
      "[yes] [it is (nice | great | good | okay)] but i miss (home | my family | my friends | lithuania) #h:l_miss",
      "i miss (home | my family | my friends) [a lot | sometimes]",
      "it is (okay | fine | not bad) [so far]",
      "it is (different | a big change) [but i like it]",
      "(yes and no | sort of | kind of)",
      "[yes] [it is (nice | great | good | okay | beautiful)] but (the weather | the food | everything | it | life | the rent | the prices) (is | are) (bad | expensive | different | cold | hot | hard | strange | too expensive | too cold)",
      "so so", "more or less", "not bad [so far]", "(it is | it is still) (a bit | a little) (strange | different | hard) [for me]", "i am still getting used to it",
    ] },
    like_no: { patterns: [
      "[no] i do not (really | ) like it [very much] [yet]", "[no] i do not (really | ) like it (here | in maple harbor | very much here) [yet]", "i do not (really | ) like (this town | this place | maple harbor | it here)",
      "it is (hard | difficult | too quiet | too cold | too expensive | boring)",
      "[no] not (so | very) much",
      "it is (hard | difficult | too quiet | too cold | too expensive | boring | too small | too far) (here | for me)", "(it is | life is) (very | too | really) expensive here",
      "i (do not | can not) get used to it", "i want to go (home | back)",
    ] },
    // Fun
    fun_ans: { patterns: [
      "i (like | love | enjoy | really like | really love | am into | am a big fan of) {hobbies} @freq #h:f_like",
      // "In my free time I …", "… with my friends"
      "@when_pre i (like | love | enjoy | usually | often | mostly | ) {hobbies} @freq", "@when_pre i [like to | usually | often] {hv} [and {hv}] @freq", "@when_pre i (play | go | do) [the] {hobbies} @freq",
      "i (play | go | do) [the] {hobbies} @with_who @freq", "i (like | love) (to | ) {hv} @with_who @freq", "i [usually | often] {hv} @with_who @freq",
      "my (hobby is | hobbies are) {hobbies}", "my favorite (hobby | thing) is {hobbies}",
      "i (like | love) (to spend | spending) time with (my family | my kids | my children | my friends | my grandchildren | my wife | my husband | my dog) #other",
      "i (like | love) (to be | being) (outside | outdoors | in nature | at home) #other", "i (like | love) nature #other", "i (like | love) to relax [at home] #other",
      "i (like | love) (to | ) {hv} [[and | ,] [i] [like to] {hv}] [and {hv}] @freq",
      "i [mostly | usually | often | sometimes] {hv} [[and | ,] [i] {hv}] [[and | ,] [i] {hv}] @freq #h:f_verbs",
      "i play [the] {hobbies} @freq #h:f_play",
      "i go {hobby} @freq",
      "i do {hobby} @freq",
      "i (like | love) playing [the] {hobbies} @freq",
    ] },
    fun_ctx: { patterns: ["[mostly | usually | i guess] {hobbies} [mostly | i guess]", "[i] {hv} [and {hv}]"] },
    fun_none: { patterns: ["(not much | nothing much | nothing special) [really]", "i do not have (much | a lot of) free time", "i work a lot", "i do not have time [for hobbies]", "i have no (free time | time | hobbies) [really]", "i do not have (any | ) hobbies", "(only | just) work", "i (just | only) (work | sleep | rest)"] },
    book_ctx: { patterns: [
      "[it is | i am reading] (a | an) [really | very] [good | funny | interesting | great | old | new] (book | novel | story | thriller | mystery | biography | detective story | travel book | love story | fantasy book) [about {w:any}]",
      "[it is | i am reading] [a | an | some] [really | very] [good | funny | interesting | great | old | new | lithuanian | english | american | history | crime | romantic] (book | novel | story | thriller | mystery | biography | detective story | crime novel | crime story) [by a {w:any} (writer | author)] [in english | in lithuanian]",
      "[it is | i am reading] (a | an) {w:any} (book | novel | story)",
      "nothing (right now | at the moment)",
      "(harry potter | the hobbit | a book by {w:any})",
    ] },
    // Asking Mark
    ask_back: { patterns: ["(and | what about | how about) (you | yourself) [mark] #h:b_and_you", "and you mark", "what about you mark", "you"] },
    q_from: { patterns: ["where are you from @mk #h:b_from", "where do you come from", "are you from (here | around here | maple harbor)", "where are you from originally", "and where are you from"] },
    q_job: { patterns: ["what do you do @mk [for (work | a living)] #h:b_job", "what is your job", "where do you work", "and what do you do", "what kind of work do you do", "tell me about your (job | work)", "what is your (profession | work)", "what (job | work) do you do"] },
    q_know: { patterns: ["how do you know sophie #h:b_know", "how did you meet (sophie | her)", "how do you two know each other", "and how do you know sophie", "how do you know her"] },
    q_time: { patterns: ["how long have you been here", "when did you (move | come) here", "are you new here [too]", "how long have you lived here", "have you been here long", "how long (do you live | you live | are you living | you are living) here", "why did you (move | come) (here | to maple harbor)", "when did you come to maple harbor"] },
    q_like: { patterns: ["do you like it here", "how do you like it here", "do you like maple harbor", "and do you like it here", "[and] do you like it [here | in maple harbor]", "do you like living here", "is it (nice | good) (here | to live here)"] },
    q_fun: { patterns: ["what do you do for fun #h:b_fun", "what are your hobbies", "do you have any hobbies", "what do you like to do [in your free time]", "and what do you do for fun", "what do you (like to do | do) (on weekends | on the weekend | in your free time | after work)", "what is your hobby"] },
    q_reading: { patterns: ["what are you reading", "do you like reading", "what book are you reading"] },
    q_live: { patterns: ["where do you live", "do you live (near here | nearby | close)"] },
    q_chef: { patterns: ["do you like (being a chef | your job | cooking)", "what kind of food do you (cook | make)", "which cafe", "where is the cafe", "what is the name of the cafe", "what is your favorite (food | dish | thing to cook | recipe)", "do you like to cook", "what do you cook [at the cafe | at work]"] },
    q_dance: { patterns: ["can you dance", "do you dance", "do you like dancing"] },
    q_lithuania: { patterns: ["have you (ever | ) been to (lithuania | europe)", "have you (ever | ) been to {country}"] },
    // The new café
    cafe_ans_no: { patterns: ["[no] not yet #h:c_not_yet", "[no] i have not [been there] [yet]", "[no] i did not know about it", "[no] never", "[no] i did not know (there is | there was | about) a new cafe [there]", "[no] not yet but i (want | would like) to (go | try it)", "[no] i (have not | did not) (been | go) there [yet]"] },
    cafe_ans_yes: { patterns: ["[yes] i have [been there]", "[yes] i went there (last week | yesterday | once)", "[yes] it is (great | nice | lovely)", "[yes] i was there (last week | yesterday | once | already | on sunday | last weekend | twice)", "[yes] (the | their) (coffee | cake | cakes | food | cheesecake | pastries) (is | was | are | were) (great | good | amazing | delicious | really good)", "[yes] i (love | like) it [there]"] },
    cafe_which: { patterns: ["which (cafe | one)", "what (cafe | new cafe)", "where is it"] },
    agree_go: { patterns: ["[sure] i would love to #h:c_love_to", "(sure | yes) let us (go | do it | do that)", "you bet", "why not", "that (sounds | would be) (great | fun | nice)", "(great | good) idea", "definitely", "sounds (good | great | fun)", "[sure | yes] let us go (this weekend | on saturday | on sunday | tomorrow | sometime | next week | together)", "[yes | sure] with pleasure", "i would like that", "(of course | sure) [why not] let us go", "why not let us (go | do it | do that) [this weekend | on saturday | on sunday | tomorrow | sometime | next week | together]"] },
    // Numbers
    swap_propose: { patterns: [
      "let us (swap | exchange | trade) (numbers | phone numbers) #h:n_swap",
      "(can | could | may) i (get | have) your (number | phone number) #h:n_can",
      "do you want to (swap | exchange) numbers",
      "what is your (number | phone number)",
      "(can | could) i (add | follow) you on (instagram | whatsapp | facebook)",
      "do you have (whatsapp | instagram | facebook)",
      "(let us | we should) (stay | keep) in touch",
      "can i give you my number",
      "give me your (number | phone number)", "(add | follow) me on (facebook | instagram | whatsapp)", "(i will | let me) give you my number", "do you want my number",
    ] },
    number_give: { patterns: [
      "[sure] [here is mine | my number is | it is | mine is] {digits} #h:n_mine",
      "[sure] [here is | this is] my (number | phone number) {digits}",
      "[of course | sure] (here is | this is) my (number | phone number | cell phone number | cell number) {digits}", "[of course | sure] (my number is | it is | mine is) {digits}",
      "[of course | sure] my (phone | cell | cell phone | mobile #tip:us_mobile) number is {digits}", "(you can | just) (call | text) me (at | on) {digits}",
    ] },
    decline_number: { patterns: ["[sorry] i do not (really | usually | ) (give out | share) my number", "maybe (next time | another time)", "i do not have a (phone | us number | local number) [yet]", "[sorry] i do not (really | usually | ) (give out | share | give) my number to (people | strangers | people i just met)", "i (prefer | would prefer) not to"] },
    drink_no: { patterns: [
      "[no] [thanks | thank you] i am (fine | good | okay | all set) [for now] [thanks] #h:d_no",
      "[no] [thanks | thank you] i (still have | have got) (one | a drink | my drink)",
      "[no] [thanks | thank you] i am (still | ) good",
      "not right now",
      "[no] [thanks | thank you] i (still have | have) (some | a full glass | plenty | my glass | wine | beer | juice)", "[no] i am driving [today | tonight | so no alcohol]",
      "no {drink} for me [thanks]", "no alcohol [for me] [thanks]", "[no] i (do not | can not) drink (tonight | today | anymore)", "i have had enough [thanks]",
    ] },
    drink2_yes: { patterns: ["[yes] (another one | one more) [please]", "[sure] (why not | i would love another one)", "[yes] [the] same (again | one | please) [please]", "[yes] [a] refill [please]", "[yes] one more (glass | drink) [please]"] },
    // Goodbye
    bye_nice: { patterns: [
      "it was (great | nice | lovely | good | really nice) (to meet you | meeting you | talking to you) [too] #h:b_great",
      "(nice | great | good) (to meet you | meeting you | talking to you) [too]",
      "same here",
      "see you around #h:b_around",
      "hope to see you (again | soon)",
      "i should (go | get going) [too]",
      "i have to go [now]",
      "(thanks | thank you) for the (chat | talk | conversation | nice evening | nice talk)", "likewise", "see you (soon | again | later) i hope", "(it was | it is) (a pleasure | my pleasure) [to meet you]",
    ] },
    me_neither: { patterns: ["me neither", "neither can i", "i can not dance either", "me too [ha]", "same here ha"] },
    cute_mark: { patterns: ["(that is | how) (funny | cool)", "(wow | really) [that is (cool | great | interesting)]", "no way"] },
  },

  lines: {
    sophie_open: [
      t("Hi! | So | glad | you | came! | Come | meet | Mark!", "Labas! | Taip | džiaugiuosi, kad | tu | atėjai! | Ateik | susipažinti su | Marku!", "Labas! Kaip gerai, kad atėjai! Ateik, susipažink su Marku!"),
    ],
    mark_hi: [
      t("Hi, | I'm | Mark.", "Labas, | aš esu | Markas.", "Labas, aš Markas."),
      t("Hey! | I'm | Mark.", "Labas! | Aš esu | Markas.", "Labas! Aš Markas."),
    ],
    nice: [
      t("Nice | to meet | you!", "Malonu | susipažinti | su tavimi!", "Malonu susipažinti!"),
      t("Great | to meet | you!", "Smagu | susipažinti | su tavimi!", "Smagu susipažinti!"),
    ],
    nice_too: [
      t("Nice | to meet | you, | too!", "Malonu | susipažinti | su tavimi | taip pat!", "Man irgi malonu!"),
    ],
    whats_name: [
      t("Sorry, | what's | your | name?", "Atsiprašau, | koks yra | tavo | vardas?", "Atsiprašau, koks tavo vardas?"),
      t("And | you | are...?", "O | tu | esi...?", "O tu...?"),
    ],
    name_again: [
      t("Sorry, | I | didn't catch | your | name.", "Atsiprašau, | aš | nenugirdau | tavo | vardo.", "Atsiprašau, nenugirdau tavo vardo."),
    ],
    mark_name: [
      t("I'm | Mark!", "Aš esu | Markas!", "Aš Markas!"),
    ],
    drink_q: [
      t("Can | I | get | you | something | to drink?", "Ar galiu | aš | atnešti | tau | ko nors | atsigerti?", "Gal atnešti tau ko nors atsigerti?"),
    ],
    drink_menu: [
      t("We | have | lemonade, | iced | tea, | soda, | beer | and | wine.", "Mes | turime | limonado, | šaltos | arbatos, | gazuotų gėrimų, | alaus | ir | vyno.", "Turime limonado, šaltos arbatos, gazuotų gėrimų, alaus ir vyno."),
    ],
    drink_ok: [
      t("Coming right up!", "Tuoj bus!", "Tuoj atnešiu!"),
      t("Sure, | I'll grab | you | one!", "Žinoma, | atnešiu | tau | —!", "Žinoma, tuoj atnešiu!", { flags: { 3: "Prop-word “one” (a drink): no Lithuanian word; atnešiu tau says it." } }),
    ],
    drink_no: [
      t("Okay, | no | problem!", "Gerai, | jokių | problemų!", "Gerai, nieko tokio!"),
    ],
    know_q: [
      t("So, | how | do | you | know | Sophie?", "Tai | iš kur | — | tu | pažįsti | Sofiją?", "Tai iš kur pažįsti Sofiją?", { flags: { 2: "Question “do”: no Lithuanian word; the tense sits on pažįsti." } }),
    ],
    and_you: [
      t("And | you?", "O | tu?", "O tu?"),
      t("How | about | you?", "O | — | tu?", "O tu?", { flags: { 1: "“about” (how about): no Lithuanian word; o … ? asks back." } }),
    ],
    know_work: [
      t("Oh, | nice! | So | you | work | together.", "O, | šaunu! | Tai | jūs | dirbate | kartu.", "O, šaunu! Tai dirbate kartu."),
    ],
    know_neigh: [
      t("Oh, | cool! | Neighbors!", "O, | šaunu! | {m:Kaimynai|f:Kaimynės}!", "O, šaunu! {m:Kaimynai|f:Kaimynės}!"),
    ],
    know_dance: [
      t("No way! | We | met | at | a | dance | class | too!", "Negali būti! | Mes | susipažinome | — | — | šokių | pamokose | irgi!", "Negali būti! Mes irgi susipažinome šokių pamokose!",
        { flags: { 3: "“at”: the locative pamokose carries it; šokių stands between." } }),
    ],
    know_class: [
      t("Oh, | fun!", "O, | smagu!", "O, smagu!"),
    ],
    know_friends: [
      t("Oh, | nice.", "O, | šaunu.", "O, šaunu."),
      t("Oh, | cool!", "O, | šaunu!", "O, šaunu!"),
    ],
    know_none: [
      t("Ha! | Well, | now | you | know | me!", "Cha! | Na, | dabar | tu | pažįsti | mane!", "Cha! Na, dabar pažįsti mane!"),
    ],
    mark_know: [
      t("We | met | at | a | dance | class, | but | I | can't dance | at all!", "Mes | susipažinome | — | — | šokių | pamokose, | bet | aš | nemoku šokti | visai!", "Susipažinome šokių pamokose, bet aš visai nemoku šokti!",
        { flags: { 2: "“at”: the locative pamokose carries it; šokių stands between." } }),
    ],
    here_to_dancing: [
      t("Ha! | Here's to | bad | dancers!", "Cha! | Už | blogus | šokėjus!", "Cha! Už prastus šokėjus!"),
    ],
    from_q: [
      t("So, | where | are | you | from?", "Tai | iš kur | esi | tu | [iš]?", "Tai iš kur tu?", { flags: { 4: F_FROM } }),
      t("Where | are | you | from, | originally?", "Iš kur | esi | tu | [iš], | {m:kilęs|f:kilusi}?", "Iš kur esi {m:kilęs|f:kilusi}?", { flags: { 3: F_FROM } }),
    ],
    lithuania_react: [
      t("Oh, | Lithuania! | That's | by | the | Baltic | Sea, | right?", "O, | Lietuva! | Tai yra | prie | — | Baltijos | jūros, | tiesa?", "O, Lietuva! Ji prie Baltijos jūros, tiesa?"),
    ],
    lithuania_short: [
      t("Oh, | Lithuania!", "O, | Lietuva!", "O, Lietuva!"),
    ],
    lithuania_sea: [
      t("That's | by | the | Baltic | Sea, | right?", "Tai yra | prie | — | Baltijos | jūros, | tiesa?", "Ji prie Baltijos jūros, tiesa?"),
    ],
    love_to_visit: [
      t("Cool! | I'd love | to visit | someday.", "Šaunu! | Labai norėčiau | aplankyti | kada nors.", "Šaunu! Labai norėčiau kada nors ten nuvykti."),
    ],
    bad_geography: [
      t("Oh, | really? | My | geography | is | terrible!", "O, | tikrai? | Mano | geografija | yra | baisi!", "O, tikrai? Mano geografija baisi!"),
    ],
    id_love_to: [
      t("I'd love | to!", "Labai norėčiau | [nuvykti]!", "Labai norėčiau!", { flags: { 1: "Elliptical “to” (I'd love to visit): Lithuanian repeats the verb nuvykti." } }),
    ],
    country_react: [
      t("Oh, | {X}! | Cool! | I've | never | been | there.", "O, | {X:nom}! | Šaunu! | Aš | niekada | nebuvau | ten.", "O, {X:nom}! Šaunu! Niekada ten nebuvau.",
        { flags: { 3: "“'ve” (have): the perfect auxiliary has no Lithuanian word; the past tense nebuvau carries it.", 5: "Negative concord: with niekada the verb takes ne- (nebuvau)." } }),
      t("Oh, | {X}! | I'd love | to visit | someday.", "O, | {X:nom}! | Labai norėčiau | aplankyti | kada nors.", "O, {X:nom}! Labai norėčiau kada nors aplankyti."),
    ],
    city_where: [
      t("Oh! | Where's | that?", "O! | Kur yra | tai?", "O! Kur tai?"),
    ],
    mishear: [
      t("Oh, | {X}? | Cool!", "O, | {X:nom}? | Šaunu!", "O, {X:nom}? Šaunu!"),
    ],
    mishear_fix: [
      t("Oh, | sorry! | {X}. | Got it.", "Oi, | atsiprašau! | {X:nom}. | Supratau.", "Oi, atsiprašau! {X:nom}. Supratau."),
    ],
    mishear_again: [
      t("Sorry, | where?", "Atsiprašau, | iš kur?", "Atsiprašau, iš kur?"),
    ],
    mark_from: [
      t("I'm | originally | from | Chicago.", "Aš esu | kilęs | iš | Čikagos.", "Aš kilęs iš Čikagos."),
    ],
    job_q: [
      t("So, | what | do | you | do?", "Tai | kuo | — | tu | dirbi?", "Tai kuo dirbi?", { flags: { 2: F_DO_WH } }),
      t("And | what | do | you | do?", "O | kuo | — | tu | dirbi?", "O kuo dirbi?", { flags: { 2: F_DO_WH } }),
    ],
    job_react: [
      t("Oh, | you're | {X.np}? | Cool!", "O, | tu esi | {X.np:nom}? | Šaunu!", "O, tu {X.np:nom}? Šaunu!"),
      t("Oh, | {X.np}! | That | must | be | interesting.", "O, | {X.np:nom}! | Tai | turbūt | yra | įdomu.", "O, {X.np:nom}! Turbūt įdomu."),
    ],
    job_chef: [
      t("No way! | Me | too!", "Negali būti! | Aš | irgi!", "Negali būti! Aš irgi!"),
    ],
    field_q: [
      t("Oh, | cool! | What | do | you | do | there?", "O, | šaunu! | Kuo | — | tu | dirbi | ten?", "O, šaunu! O kuo ten dirbi?", { flags: { 3: F_DO_WH } }),
    ],
    student_react: [
      t("Oh, | nice! | Student | life!", "O, | šaunu! | Studentiškas | gyvenimas!", "O, šaunu! Studentiškas gyvenimas!"),
    ],
    retired_react: [
      t("Oh, | nice! | Lucky you!", "O, | puiku! | Tau pasisekė!", "O, puiku! Tau pasisekė!"),
    ],
    looking_react: [
      t("I'm | sure | you'll find | something | soon.", "Aš esu | tikras, kad | tu rasi | ką nors | greitai.", "Esu tikras, kad greitai ką nors rasi."),
    ],
    home_react: [
      t("That's | a | full-time | job!", "Tai yra | — | visos dienos | darbas!", "Tai – visos dienos darbas!"),
    ],
    own_react: [
      t("Wow, | your | own | business! | That's | great.", "Oho, | tavo | nuosavas | verslas! | Tai yra | puiku.", "Oho, nuosavas verslas! Puiku."),
    ],
    mark_job: [
      t("I'm | a | chef | at | a | little | café | downtown.", "Aš esu | — | virėjas | — | — | mažoje | kavinėje | centre.", "Esu virėjas mažoje kavinėje centre.",
        { flags: { 3: "“at”: the locative kavinėje carries it; the adjective mažoje stands between." } }),
    ],
    mark_chef: [
      t("I | love | it, | but | it's | a | lot | of work.", "Aš | dievinu | jį, | bet | tai yra | — | daug | darbo.", "Labai jį mėgstu, bet tai daug darbo."),
    ],
    time_q: [
      t("How | long | have | you | been | here?", "Kiek | laiko | — | tu | esi | čia?", "Kiek laiko čia gyveni?", { flags: { 2: "Perfect “have”: no Lithuanian word; Lithuanian uses the present (esi) for a state that still goes on." } }),
      t("So, | how | long | have | you | been | here?", "Tai | kiek | laiko | — | tu | esi | čia?", "Tai kiek laiko čia gyveni?", { flags: { 3: "Perfect “have”: no Lithuanian word; Lithuanian uses the present (esi) for a state that still goes on." } }),
    ],
    time_long: [
      t("Wow! | I | only | moved | here | in May.", "Oho! | Aš | tik | atsikrausčiau | čia | gegužę.", "Oho! O aš atsikrausčiau tik gegužę."),
    ],
    time_same: [
      t("Oh, | about | the | same | as | me! | I | moved | here | in May.", "O, | maždaug | — | tiek pat | kaip | aš! | Aš | atsikrausčiau | čia | gegužę.", "O, maždaug kaip ir aš! Atsikrausčiau gegužę."),
    ],
    time_short: [
      t("Oh, | so | you're | new | too! | I | moved | here | in May.", "O, | tai | tu esi | {m:naujokas|f:naujokė} | irgi! | Aš | atsikrausčiau | čia | gegužę.", "O, tai tu irgi {m:naujokas|f:naujokė}! Aš atsikrausčiau gegužę."),
    ],
    time_life: [
      t("Oh, | so | you're | a | local!", "O, | tai | tu esi | — | {m:vietinis|f:vietinė}!", "O, tai tu {m:vietinis|f:vietinė}!"),
    ],
    mark_time: [
      t("I | only | moved | here | in May.", "Aš | tik | atsikrausčiau | čia | gegužę.", "Atsikrausčiau tik gegužę."),
    ],
    like_q: [
      t("Do | you | like | it | here | so far?", "Ar | tau | patinka | — | čia | kol kas?", "Ar tau čia kol kas patinka?", { flags: { 0: F_DO_Q, 3: "Dummy “it”: patinka needs no object pronoun here." } }),
    ],
    like_yes: [
      t("Me | too! | Everyone | is | so | friendly.", "Man | irgi! | Visi | yra | tokie | draugiški.", "Man irgi! Visi tokie draugiški."),
    ],
    like_mixed: [
      t("I | get | it. | I | miss | Chicago | sometimes, | too.", "Aš | suprantu | tai. | Aš | ilgiuosi | Čikagos | kartais, | irgi.", "Suprantu. Aš irgi kartais ilgiuosi Čikagos."),
    ],
    like_no: [
      t("Oh | no! | Give | it | time. | It | gets | easier!", "O | ne! | Duok | tam | laiko. | Tai | pasidaro | lengviau!", "O ne! Duok laiko – bus lengviau!"),
    ],
    mark_like: [
      t("I | love | it! | And | the | ocean | is | amazing.", "Aš | dievinu | tai! | O | — | vandenynas | yra | nuostabus.", "Man labai patinka! O vandenynas nuostabus."),
    ],
    fun_q: [
      t("So, | what | do | you | do | for fun?", "Tai | ką | — | tu | veiki | laisvalaikiu?", "Tai ką veiki laisvalaikiu?", { flags: { 2: F_DO_WH } }),
    ],
    fun_shared: [
      t("Me | too! | I | love | {X}.", "Aš | irgi! | Aš | labai mėgstu | {X:acc}.", "Aš irgi! Labai mėgstu {X:acc}."),
    ],
    fun_cooking: [
      t("Ha! | Me | too! | Well, | it's | my | job.", "Cha! | Aš | irgi! | Na, | tai yra | mano | darbas.", "Cha! Aš irgi! Na, tai mano darbas."),
    ],
    fun_dancing: [
      t("Dancing? | You're | braver | than | me!", "Šokiai? | Tu esi | {m:drąsesnis|f:drąsesnė} | už | mane!", "Šokiai? Tu {m:drąsesnis|f:drąsesnė} už mane!"),
    ],
    fun_basketball: [
      t("Of course! | Lithuanians | love | basketball, | right?", "Žinoma! | Lietuviai | dievina | krepšinį, | tiesa?", "Žinoma! Lietuviai dievina krepšinį, tiesa?"),
    ],
    knew_it: [
      t("I | knew | it!", "Aš | žinojau | tai!", "Taip ir žinojau!"),
    ],
    fun_mushrooms: [
      t("Mushroom | picking? | That's | so | cool!", "Grybų | rinkimas? | Tai yra | taip | šaunu!", "Grybavimas? Kaip šaunu!"),
    ],
    fun_generic: [
      t("Oh, | cool! | That | sounds | fun.", "O, | šaunu! | Tai | skamba | smagiai.", "O, šaunu! Skamba smagiai."),
      t("Nice! | I've | always | wanted | to try | that.", "Puiku! | Aš | visada | norėjau | išbandyti | tai.", "Puiku! Visada norėjau tai išbandyti.", { flags: { 1: "“'ve” (have): no Lithuanian word; the past norėjau carries it." } }),
    ],
    fun_none: [
      t("Ha, | I | know | the | feeling!", "Cha, | aš | žinau | tą | jausmą!", "Cha, pažįstamas jausmas!", { flags: { 3: "“the feeling” (that familiar feeling): the article gets its real demonstrative tą." } }),
    ],
    mark_fun: [
      t("I | run, | and | I | cook, | of course! | But | at home | I | mostly | eat | toast.", "Aš | bėgioju, | ir | aš | gaminu, | žinoma! | Bet | namie | aš | dažniausiai | valgau | skrebučius.", "Bėgioju ir, žinoma, gaminu! Bet namie dažniausiai valgau skrebučius."),
    ],
    reading_q: [
      t("Oh, | what | are | you | reading | right now?", "O, | ką | — | tu | skaitai | šiuo metu?", "O ką dabar skaitai?", { flags: { 2: "Progressive “are”: the present tense of skaitai carries it." } }),
    ],
    reading_react: [
      t("Sounds | good!", "Skamba | gerai!", "Skamba gerai!"),
    ],
    mark_reading: [
      t("A | mystery | novel. | It's | really | good!", "— | Detektyvinį | romaną. | Jis yra | tikrai | geras!", "Detektyvinį romaną. Tikrai geras!"),
    ],
    mark_live: [
      t("On | Oak | Avenue, | near | the | park.", "— | Ąžuolų | alėjoje, | netoli | — | parko.", "Ąžuolų alėjoje, netoli parko.", { flags: { 0: "“On”: the locative alėjoje carries it; Ąžuolų stands between." } }),
    ],
    mark_dance: [
      t("Not at all! | That's | why | I'm | standing | by | the | wall.", "Visai ne! | Todėl | — | aš | stoviu | prie | — | sienos.", "Visai nemoku! Todėl ir stoviu prie sienos.",
        { flags: { 2: "“why” (that's why): todėl carries “that's why”.", 3: "“'m” (am) is progressive: the present stoviu carries it." } }),
    ],
    mark_lithuania: [
      t("No, | never! | But | I'd love | to go | someday.", "Ne, | niekada! | Bet | labai norėčiau | nuvykti | kada nors.", "Ne, niekada! Bet labai norėčiau kada nors nuvykti."),
    ],
    cafe_q: [
      t("Have | you | been | to | the | new | café | on the corner?", "Ar | tu | buvai | — | — | naujoje | kavinėje | ant kampo?", "Ar buvai naujoje kavinėje ant kampo?",
        { flags: { 0: "Perfect “Have” in a yes/no question = the particle ar; the past tense sits on buvai.", 3: "“to”: the locative kavinėje carries it; the adjective naujoje stands between." } }),
    ],
    cafe_try: [
      t("Oh, | you | should | try | it! | Their | cakes | are | amazing.", "O, | tu | turėtum | išbandyti | ją! | Jų | pyragai | yra | nuostabūs.", "O, turėtum ją išbandyti! Jų pyragai nuostabūs."),
    ],
    cafe_great: [
      t("Their | cakes | are | amazing, | right?", "Jų | pyragai | yra | nuostabūs, | tiesa?", "Jų pyragai nuostabūs, tiesa?"),
    ],
    cafe_which: [
      t("The | little | one | next to | the | bakery.", "Ta | maža | — | šalia | — | kepyklos.", "Ta maža, šalia kepyklos.", { flags: { 0: "“The … one”: the article gets the demonstrative ta here.", 2: "Prop-word “one”: Lithuanian uses the adjective alone (maža)." } }),
    ],
    cafe_go_q: [
      t("Maybe | we | could | go | together | sometime?", "Gal | mes | galėtume | nueiti | kartu | kada nors?", "Gal galėtume kada nors nueiti kartu?"),
    ],
    cafe_go_yes: [
      t("Awesome!", "Puiku!", "Puiku!"),
    ],
    cafe_go_no: [
      t("No | worries.", "Jokių | rūpesčių.", "Nieko tokio."),
    ],
    mark_cafe: [
      t("Yes, | I | go | there | all the time!", "Taip, | aš | einu | ten | nuolat!", "Taip, einu ten nuolat!"),
    ],
    your_turn: [
      t("Hey, | I've been asking | all | the | questions! | Your | turn.", "Ei, | aš klausinėju | visus | — | klausimus! | Tavo | eilė.", "Ei, klausinėju tik aš! Tavo eilė."),
    ],
    ask_me: [
      t("Ask | me | something!", "Paklausk | manęs | ko nors!", "Paklausk manęs ko nors!"),
    ],
    just_tell: [
      t("Ha! | Okay, | I'll tell | you. | I'm | from | Chicago, | and | I'm | a | chef.", "Cha! | Gerai, | papasakosiu | tau. | Aš esu | iš | Čikagos | ir | aš esu | — | virėjas.", "Cha! Gerai, papasakosiu: esu iš Čikagos ir dirbu virėju."),
    ],
    drink2_q: [
      t("Can | I | get | you | another | drink?", "Ar galiu | aš | atnešti | tau | dar vieną | gėrimą?", "Gal atnešti tau dar ko nors atsigerti?"),
    ],
    drink2_ok: [
      t("Sure, | coming right up!", "Žinoma, | tuoj bus!", "Žinoma, tuoj atnešiu!"),
    ],
    time_late: [
      t("Oh, | look | at | the | time! | It's | almost | half | past | nine.", "O, | pažiūrėk, | — | — | kiek valandų! | Yra | beveik | pusė | — | dešimtos.", "O, pažiūrėk, kiek valandų! Jau beveik pusė dešimtos.",
        { flags: { 2: "“at”: pažiūrėk, kiek … needs no preposition.", 5: "Dummy “it” of time: merged with its verb (yra).", 8: "“past”: Lithuanian counts the half towards the next hour (pusė dešimtos)." } }),
    ],
    get_going: [
      t("I | should | get going | soon.", "Man | reikėtų | eiti | netrukus.", "Man jau netrukus reikės eiti."),
    ],
    swap_q: [
      t("Hey, | let's swap | numbers! | We | should | hang out | sometime.", "Ei, | apsikeiskime | numeriais! | Mums | reikėtų | susitikti | kada nors.", "Ei, apsikeiskime numeriais! Reikėtų kada nors susitikti."),
    ],
    swap_reask: [
      t("So, | do | you | want | to swap | numbers?", "Tai | ar | tu | nori | apsikeisti | numeriais?", "Tai gal apsikeičiam numeriais?", { flags: { 1: "Question “do” = the particle ar." } }),
    ],
    swap_sure: [
      t("Sure! | Good | idea.", "Žinoma! | Gera | mintis.", "Žinoma! Gera mintis."),
    ],
    ask_number: [
      t("Great! | What's | your | number?", "Puiku! | Koks yra | tavo | numeris?", "Puiku! Koks tavo numeris?"),
    ],
    number_got: [
      t("Got it! | I'll text | you | so | you | have | mine.", "Supratau! | Parašysiu | tau, | kad | tu | turėtum | manąjį.", "Supratau! Parašysiu tau žinutę, kad turėtum mano numerį."),
    ],
    mark_number: [
      t("Here's | mine: | 555-0187.", "Štai | mano: | 555-0187.", "Štai mano: 555-0187.", { say: "Here's mine: five five five, oh one eight seven.", write: "Mark: 555-0187" }),
    ],
    decline_ok: [
      t("No | worries!", "Jokių | rūpesčių!", "Nieko tokio!"),
    ],
    great_meet: [
      t("It was | great | to meet | you!", "Buvo | smagu | susipažinti | su tavimi!", "Buvo smagu susipažinti!"),
      t("It was | really | nice | to meet | you!", "Buvo | tikrai | malonu | susipažinti | su tavimi!", "Buvo tikrai malonu susipažinti!"),
    ],
    see_around: [
      t("See you around!", "Dar pasimatysim!", "Dar pasimatysim!"),
      t("See you | soon!", "Iki | greito!", "Iki greito!"),
    ],
    sophie_bye: [
      t("Leaving | already? | Thanks | for | coming!", "Išeini | jau? | Ačiū, | kad | atėjai!", "Jau išeini? Ačiū, kad atėjai!"),
    ],
    ha: [
      t("Ha!", "Cha!", "Cha!"),
      t("Right?", "Tiesa?", "Ar ne?"),
    ],
    ok: [
      t("Cool.", "Šaunu.", "Šaunu."),
      t("Nice.", "Puiku.", "Puiku."),
    ],
  },

  hints: {
    intro: {
      lt: "Prisistatyti",
      items: [
        { id: "i_im", s: t("Hi, | I'm | {$name}. | Nice | to meet | you!", "Labas, | aš esu | {$name}. | Malonu | susipažinti | su tavimi!", "Labas, aš {$name}. Malonu susipažinti!") },
        { id: "i_im", s: t("My | name | is | {$name}.", "Mano | vardas | yra | {$name}.", "Mano vardas – {$name}.") },
        { id: "i_nice", s: t("Nice | to meet | you, | too!", "Malonu | susipažinti | su tavimi | taip pat!", "Man irgi malonu!") },
      ],
    },
    drink: {
      lt: "Pasirinkti gėrimą", slot: "drink", examples: ["lemonade", "iced_tea", "water"],
      items: [
        { id: "d_can", s: t("Can | I | have | {X.np}, | please?", "Ar galiu | aš | gauti | {X.np:acc}, | prašau?", "Ar galiu gauti {X.np:gen}?") },
        { id: "d_would", s: t("{X.np} | would be | great, | thanks.", "{X.np:nom} | būtų | puiku, | ačiū.", "{X.np:nom} būtų puiku, ačiū.") },
        { id: "d_just", s: t("Just | water, | please.", "Tik | vandens, | prašau.", "Tik vandens, prašau.") },
        { id: "d_no", s: t("No, | thanks, | I'm | fine.", "Ne, | ačiū, | man | gerai.", "Ne, ačiū, man nieko nereikia.") },
      ],
    },
    know: {
      lt: "Pasakyti, iš kur pažįsti Sofiją",
      items: [
        { id: "k_work", s: t("We | work | together.", "Mes | dirbame | kartu.", "Dirbame kartu.") },
        { id: "k_neigh", s: t("We're | neighbors.", "Mes esame | {m:kaimynai|f:kaimynės}.", "Esame {m:kaimynai|f:kaimynės}.") },
        { id: "k_class", s: t("We | met | at | a | dance | class.", "Mes | susipažinome | — | — | šokių | pamokose.", "Susipažinome šokių pamokose.", { flags: { 2: "“at”: the locative pamokose carries it; šokių stands between." } }) },
        { id: "k_friend", s: t("She's | an | old | friend.", "Ji yra | — | sena | draugė.", "Ji – sena draugė.") },
      ],
    },
    from: {
      lt: "Pasakyti, iš kur esi", slot: "country", examples: ["lithuania", "poland", "germany"],
      items: [
        { id: "fr_from", s: t("I'm | from | {X}.", "Aš esu | iš | {X:gen}.", "Aš iš {X:gen}.") },
        { id: "fr_city", s: t("I'm | from | Vilnius, | in Lithuania.", "Aš esu | iš | Vilniaus, | Lietuvoje.", "Aš iš Vilniaus, Lietuvoje."), only: (e) => e.id === "lithuania" },
        { id: "fr_from", s: t("Lithuania, | by | the | sea.", "Iš Lietuvos, | prie | — | jūros.", "Iš Lietuvos, prie jūros."), only: (e) => e.id === "lithuania" },
      ],
    },
    sea: {
      lt: "Patvirtinti ir pakviesti aplankyti",
      items: [
        { id: "sea_yes", s: t("Yes, | that's | right!", "Taip, | tai yra | teisinga!", "Taip, teisingai!") },
        { id: "sea_visit", s: t("Yes! | You | should | visit!", "Taip! | Tau | reikėtų | aplankyti!", "Taip! Turėtum atvažiuoti!", { flags: { 2: "“You should”: the dative tau with the conditional reikėtų carries it." } }) },
      ],
    },
    city: {
      lt: "Paaiškinti, kur tas miestas", slot: "country", examples: ["lithuania"],
      items: [
        { id: "city_in", s: t("It's | in | {X}.", "Tai yra | — | {X:loc}.", "Tai {X:loc}.", { flags: { 1: "“in”: the locative ending carries it." } }) },
        { id: "city_in", s: t("In | {X}.", "— | {X:loc}.", "{X:loc}.", { flags: { 0: "“In”: the locative ending carries it." } }) },
        { id: "city_in", s: t("It's | a | city | in | {X}.", "Tai yra | — | miestas | — | {X:loc}.", "Tai miestas {X:loc}.", { flags: { 3: "“in”: the locative ending carries it." } }) },
      ],
    },
    back: {
      lt: "Paklausti Marko to paties",
      items: [
        { id: "b_and_you", s: t("And | you?", "O | tu?", "O tu?") },
        { id: "b_and_you", s: t("What about | you?", "O | tu?", "O tu?") },
        { id: "b_from", s: t("Where | are | you | from?", "Iš kur | esi | tu | [iš]?", "Iš kur tu?", { flags: { 3: F_FROM } }) },
        { id: "b_job", s: t("What | do | you | do?", "Kuo | — | tu | dirbi?", "Kuo tu dirbi?", { flags: { 1: F_DO_WH } }) },
        { id: "b_know", s: t("How | do | you | know | Sophie?", "Iš kur | — | tu | pažįsti | Sofiją?", "Iš kur pažįsti Sofiją?", { flags: { 1: F_DO_WH } }) },
        { id: "b_fun", s: t("What | do | you | do | for fun?", "Ką | — | tu | veiki | laisvalaikiu?", "Ką veiki laisvalaikiu?", { flags: { 1: F_DO_WH } }) },
      ],
    },
    job: {
      lt: "Pasakyti, kuo dirbi", slot: "job", examples: ["nurse", "teacher", "engineer", "developer"],
      items: [
        { id: "j_im", s: t("I'm | {X.np}.", "Aš esu | {X.np:nom}.", "Esu {X:nom}.") },
        { id: "j_work_as", s: t("I | work | as | {X.np}.", "Aš | dirbu | — | {X.np:ins}.", "Dirbu {X:ins}.", { flags: { 2: "“as”: the instrumental case carries it." } }) },
        { id: "j_field", s: t("I | work | in a hospital.", "Aš | dirbu | ligoninėje.", "Dirbu ligoninėje.") },
        { id: "j_retired", s: t("I'm | retired.", "Aš esu | {m:pensininkas|f:pensininkė}.", "Esu {m:pensininkas|f:pensininkė}.") },
        { id: "j_looking", s: t("I'm looking | for | a | job | right now.", "Aš ieškau | — | — | darbo | šiuo metu.", "Šiuo metu ieškau darbo.", { flags: { 1: "“for”: the genitive darbo after ieškoti carries it." } }) },
      ],
    },
    ask_mark: {
      lt: "Paklausti Marko apie jį patį",
      items: [
        { id: "b_from", s: t("Where | are | you | from?", "Iš kur | esi | tu | [iš]?", "Iš kur tu?", { flags: { 3: F_FROM } }) },
        { id: "b_job", s: t("What | do | you | do?", "Kuo | — | tu | dirbi?", "Kuo tu dirbi?", { flags: { 1: F_DO_WH } }) },
        { id: "b_fun", s: t("What | do | you | do | for fun?", "Ką | — | tu | veiki | laisvalaikiu?", "Ką veiki laisvalaikiu?", { flags: { 1: F_DO_WH } }) },
        { id: "b_know", s: t("How | do | you | know | Sophie?", "Iš kur | — | tu | pažįsti | Sofiją?", "Iš kur pažįsti Sofiją?", { flags: { 1: F_DO_WH } }) },
      ],
    },
    time: {
      lt: "Pasakyti, kiek laiko čia gyveni",
      items: [
        { id: "t_dur", s: t("About | a | year.", "Maždaug | — | metus.", "Maždaug metus.") },
        { id: "t_dur", s: t("Since | May.", "Nuo | gegužės.", "Nuo gegužės.") },
        { id: "t_dur", s: t("Two | months.", "Du | mėnesius.", "Du mėnesius.") },
        { id: "t_dur", s: t("I | just | moved | here.", "Aš | ką tik | atsikrausčiau | čia.", "Ką tik atsikrausčiau.") },
      ],
    },
    like: {
      lt: "Pasakyti, ar čia patinka",
      items: [
        { id: "l_love", s: t("Yes, | I | love | it!", "Taip, | man | labai patinka | —!", "Taip, labai patinka!", { flags: { 3: "“it”: patinka needs no object pronoun." } }) },
        { id: "l_people", s: t("People | are | so | friendly.", "Žmonės | yra | tokie | draugiški.", "Žmonės tokie draugiški.") },
        { id: "l_miss", s: t("It's | great, | but | I | miss | home.", "Tai yra | puiku, | bet | aš | ilgiuosi | namų.", "Puiku, bet ilgiuosi namų.") },
      ],
    },
    fun: {
      lt: "Papasakoti, ką veiki laisvalaikiu", slot: "hobby", examples: ["hiking", "reading", "cooking", "basketball"],
      items: [
        { id: "f_like", s: t("I | like | {X}.", "Aš | mėgstu | {X:acc}.", "Mėgstu {X:acc}."), only: (e) => e.attrs?.kind === "act" },
        { id: "f_like", s: t("I | love | {X}.", "Aš | labai mėgstu | {X:acc}.", "Labai mėgstu {X:acc}."), only: (e) => e.attrs?.kind === "act" },
        { id: "f_play", s: t("I | play | {X}.", "Aš | žaidžiu | {X:acc}.", "Žaidžiu {X:acc}."), only: (e) => e.attrs?.kind === "play" },
        { id: "f_play", s: t("I | play | the | {X}.", "Aš | groju | — | {X:ins}.", "Groju {X:ins}."), only: (e) => e.attrs?.kind === "instr" },
        { id: "f_verbs", s: t("I | run, | I | read, | I | cook.", "Aš | bėgioju, | aš | skaitau, | aš | gaminu.", "Bėgioju, skaitau, gaminu.") },
      ],
    },
    reading: {
      lt: "Pasakyti, ką skaitai",
      items: [
        { id: "r_book", s: t("A | funny | travel | book.", "— | Juokingą | kelionių | knygą.", "Juokingą kelionių knygą.") },
        { id: "r_book", s: t("A | detective | story.", "— | Detektyvinę | istoriją.", "Detektyvą.") },
        { id: "r_book", s: t("Nothing | right now.", "Nieko | šiuo metu.", "Šiuo metu nieko neskaitau.") },
      ],
    },
    agree: {
      lt: "Patvirtinti",
      items: [
        { id: "ag_course", s: t("Of course!", "Žinoma!", "Žinoma!") },
        { id: "sea_yes", s: t("Yes, | that's | right!", "Taip, | tai yra | teisinga!", "Taip, teisingai!") },
      ],
    },
    mishear: {
      lt: "Pataisyti Marką",
      items: [
        { id: "mh_no", s: t("No, | Lithuania!", "Ne, | Lietuva!", "Ne, Lietuva!") },
        { id: "mh_not", s: t("Not | Latvia, | Lithuania!", "Ne | Latvija, | Lietuva!", "Ne Latvija, o Lietuva!") },
      ],
    },
    cafe: {
      lt: "Atsakyti apie naują kavinę",
      items: [
        { id: "c_not_yet", s: t("Not yet!", "Dar ne!", "Dar ne!") },
        { id: "c_yes", s: t("Yes, | I | have.", "Taip, | aš | [buvau].", "Taip, buvau.", { flags: { 2: "Elliptical “have” (I have been there): Lithuanian repeats the verb buvau." } }) },
        { id: "c_which", s: t("Which | café?", "Kuri | kavinė?", "Kuri kavinė?") },
      ],
    },
    cafe_go: {
      lt: "Sutikti nueiti kartu",
      items: [
        { id: "c_love_to", s: t("Sure, | I'd love | to!", "Žinoma, | labai norėčiau | [nueiti]!", "Žinoma, labai norėčiau!", { flags: { 2: "Elliptical “to” (I'd love to go): Lithuanian repeats the verb nueiti." } }) },
        { id: "c_sounds", s: t("Sounds | great!", "Skamba | puikiai!", "Puiki mintis!") },
        { id: "c_idea", s: t("Good | idea!", "Gera | mintis!", "Gera mintis!") },
      ],
    },
    numbers: {
      lt: "Apsikeisti telefono numeriais",
      items: [
        { id: "n_mine", s: t("Sure! | Here's | mine: | 555-0142.", "Žinoma! | Štai | mano: | 555-0142.", "Žinoma! Štai mano: 555-0142.", { say: "Sure! Here's mine: five five five, oh one four two." }) },
        { id: "n_can", s: t("Can | I | get | your | number?", "Ar galiu | aš | gauti | tavo | numerį?", "Ar galiu gauti tavo numerį?") },
        { id: "n_swap", s: t("Let's swap | numbers!", "Apsikeiskime | numeriais!", "Apsikeiskime numeriais!") },
      ],
    },
    my_number: {
      lt: "Pasakyti savo numerį",
      items: [
        { id: "n_mine", s: t("It's | 555-0142.", "Tai | 555-0142.", "555-0142.", { say: "It's five five five, oh one four two." }) },
        { id: "n_mine", s: t("Sure! | Here's | mine: | 555-0142.", "Žinoma! | Štai | mano: | 555-0142.", "Žinoma! Štai mano: 555-0142.", { say: "Sure! Here's mine: five five five, oh one four two." }) },
      ],
    },
    bye: {
      lt: "Atsisveikinti",
      items: [
        { id: "b_great", s: t("It was | great | to meet | you!", "Buvo | smagu | susipažinti | su tavimi!", "Buvo smagu susipažinti!") },
        { id: "b_great", s: t("You | too! | See you around!", "Tau | irgi! | Dar pasimatysim!", "Man irgi! Dar pasimatysim!") },
        { id: "b_around", s: t("See you around!", "Dar pasimatysim!", "Dar pasimatysim!") },
      ],
    },
  },

  tips: {
    us_soccer: { key: "us_soccer", lt: "Suprasta! Amerikoje „football“ – amerikietiškas futbolas; mūsų futbolas – „soccer“.", better: "I play soccer." },
    us_college: { key: "us_college", lt: "Suprasta! Amerikoje sakoma „I'm in college“.", better: "I'm in college." },
    us_flat: { key: "us_flat", lt: "Suprasta! Amerikoje sakoma „apartment“.", better: "I live in an apartment." },
    us_mobile: { key: "us_mobile", lt: "Suprasta! Amerikoje sakoma „cell phone“ arba tiesiog „number“.", better: "Here's my number." },
    us_retired: { key: "us_retired", lt: "Suprasta! Amerikoje dažniau sakoma „I'm retired“.", better: "I'm retired." },
  },

  merges: {
    "not at all": { reason: "lexical_expression", split: "not → ne + at all → visai gives “ne visai” (not quite); the emphatic reply = visai ne.", minimal: "Three words." },
    "not yet": { reason: "lexical_expression", split: "not → ne + yet → dar gives “ne dar”; the reply = dar ne (the order carries the meaning).", minimal: "Two words." },
    "all the time": { reason: "lexical_expression", split: "all → visas, the → —, time → laikas is a literal reading; = nuolat.", minimal: "Three words." },
    "next to": { reason: "lexical_expression", split: "next → kitas + to → į is false; = šalia (C-LEX).", minimal: "Two words." },
    "would be": { reason: "grammatical_fusion", split: "“would” has no separate word: the conditional būtų carries it.", minimal: "Two words." },
    "to meet": { reason: "grammatical_fusion", split: "Infinitive “to” → į would be false (C-INF).", minimal: "Two words." },
    "no way": { reason: "lexical_expression", split: "no → jokio + way → kelio is false; the exclamation = negali būti!", minimal: "Two words." },
    "i'd love": { reason: "grammatical_fusion", split: "I'd → aš drops “would”; the conditional norėčiau carries would + love (labai norėčiau).", minimal: "The infinitive stays outside." },
    "to visit": { reason: "grammatical_fusion", split: "Infinitive “to” → į would be false (C-INF).", minimal: "Two words." },
    "lucky you": { reason: "lexical_expression", split: "lucky → laimingas + you → tu is a calque; = tau pasisekė.", minimal: "Two words." },
    "so far": { reason: "lexical_expression", split: "so → taip + far → toli is false; = kol kas.", minimal: "Two words." },
    "for fun": { reason: "lexical_expression", split: "for → dėl + fun → linksmybės is false; “do for fun” = laisvalaikiu.", minimal: "Two words." },
    "in may": { reason: "grammatical_fusion", split: "The accusative of time gegužę carries “in” (C-CASE).", minimal: "Two words." },
    "of work": { reason: "grammatical_fusion", split: "The genitive darbo carries “of” (C-CASE).", minimal: "Two words." },
    "at home": { reason: "grammatical_fusion", split: "The adverb namie carries “at” (C-CASE).", minimal: "Two words." },
    "on the corner": { reason: "lexical_expression", split: "“on the corner” = ant kampo (the preposition ant is Lithuanian too; kept together as a place phrase).", minimal: "No adjective inside." },
    "i've been asking": { reason: "grammatical_fusion", split: "Present perfect progressive: 've (have) and been have no Lithuanian words; the present klausinėju carries the ongoing action.", minimal: "Object stays outside." },
    "get going": { reason: "lexical_expression", split: "get → gauti + going → einantis is false; = eiti (išeiti).", minimal: "Two words." },
    "let's swap": { reason: "grammatical_fusion", split: "Let's → leiskime + swap → keistis is a calque; the imperative apsikeiskime carries “let's”.", minimal: "Two words." },
    "hang out": { reason: "lexical_expression", split: "hang → kabėti + out → lauk is false; = susitikti, pabūti kartu (C-PHR).", minimal: "Two words." },
    "it was": { reason: "grammatical_fusion", split: "Dummy “it”: merged with its verb (buvo), as with It is → Yra (C-DUMMY).", minimal: "Two words." },
    "see you around": { reason: "lexical_expression", split: "see → matyti, you → tave, around → aplink is a literal reading of a farewell (= dar pasimatysim).", minimal: "Three words." },
    "here's to": { reason: "lexical_expression", split: "here's → štai + to → į is false; the toast “here's to …” = už …", minimal: "Two words." },
    "what about": { reason: "lexical_expression", split: "what → kas + about → apie is a calque; asking back = o …?", minimal: "Two words." },
    "in lithuania": { reason: "grammatical_fusion", split: "The locative Lietuvoje carries “in” (C-CASE).", minimal: "Two words." },
    "can't dance": { reason: "grammatical_fusion", split: "Negation is the prefix ne- of nemoku (C-NEG); can = moku (know how).", minimal: "Two words." },
    "at all": { reason: "lexical_expression", split: "at → prie + all → viskas is false; = visai (C-LEX).", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Prisistatyk Markui", step: "name" },
    { lt: "Pasakyk, iš kur pažįsti Sofiją", optional: true, when: (c) => planned(c, "know"), done: (c) => isDone(c, "know") },
    { lt: "Pasakyk, iš kur esi", done: (c) => isDone(c, "from") },
    { lt: "Pasakyk, kuo dirbi", done: (c) => isDone(c, "job") },
    { lt: "Papasakok apie laisvalaikį", optional: true, when: (c) => planned(c, "fun"), done: (c) => isDone(c, "fun") },
    { lt: "Paklausk jo atgal", done: (c) => !!(c.s.askedBack || c.s.turnSkipped) },
    { lt: "Apsikeiskite numeriais", optional: true, when: (c) => c.s.numbersDone !== "declined", done: (c) => c.s.numbersDone === true },
  ],

  steps: [
    { id: "name", done: (c) => !!c.s.named,
      ask: (c) => M(c, "whats_name"),
      expects: ["intro_name", "nice_meet", "name_ctx"],
      suggest: [{ lt: "Prisistatyti Markui", hint: "intro" }] },
    { id: "drink", when: (c) => !!c.s.plan.includes("drink") && !!c.s.named, done: (c) => !!c.s.drinkDone,
      ask: (c) => { SO(c, "drink_q"); },
      expects: ["drink_ans", "drink_menu", "drink_no"],
      suggest: [{ lt: "Pasirinkti gėrimą arba padėkoti", hint: "drink", options: "drink" }],
      yes: (c) => { c.s.drinkDone = true; SO(c, "drink_ok"); },
      no: (c) => { c.s.drinkDone = true; SO(c, "drink_no"); } },
    { id: "know", when: (c) => !!c.s.plan.includes("know") && !!c.s.named, done: (c) => isDone(c, "know"),
      ask: (c) => askTopic(c, "know", "know_q"),
      expects: ["know_ans", "ask_back", "q_know"],
      suggest: [{ lt: "Pasakyti, iš kur pažįsti Sofiją", hint: "know" }, { lt: "Paklausti Marko to paties", hint: "back" }] },
    { id: "from", when: (c) => !!c.s.named, done: (c) => isDone(c, "from"),
      ask: (c) => askTopic(c, "from", "from_q"),
      expects: ["from_ans", "from_ctx", "ask_back", "q_from"],
      suggest: [{ lt: "Pasakyti, iš kur esi", hint: "from", options: "country" }, { lt: "Paklausti Marko to paties", hint: "back" }] },
    { id: "job", when: (c) => !!c.s.named && isDone(c, "from"), done: (c) => isDone(c, "job"),
      ask: (c) => askTopic(c, "job", "job_q"),
      expects: ["job_ans", "job_ctx", "ask_back", "q_job"],
      suggest: [{ lt: "Pasakyti, kuo dirbi", hint: "job", options: "job" }, { lt: "Paklausti Marko to paties", hint: "back" }],
      help: (c) => { done(c, "job"); M(c, "ok"); } },
    { id: "time", when: (c) => !!c.s.plan.includes("time") && isDone(c, "job"), done: (c) => isDone(c, "time"),
      ask: (c) => askTopic(c, "time", "time_q"),
      expects: ["time_ans", "ask_back", "q_time"],
      suggest: [{ lt: "Pasakyti, kiek laiko čia gyveni", hint: "time" }, { lt: "Paklausti Marko to paties", hint: "back" }],
      help: (c) => { done(c, "time"); M(c, "ok"); } },
    { id: "like", when: (c) => !!c.s.plan.includes("like") && isDone(c, "job"), done: (c) => isDone(c, "like"),
      ask: (c) => askTopic(c, "like", "like_q"),
      expects: ["like_yes", "like_mixed", "like_no", "ask_back", "q_like"],
      suggest: [{ lt: "Pasakyti, ar čia patinka", hint: "like" }, { lt: "Paklausti Marko to paties", hint: "back" }],
      yes: (c) => { done(c, "like"); M(c, "like_yes"); },
      no: (c) => { done(c, "like"); M(c, "like_no"); } },
    { id: "fun", when: (c) => !!c.s.plan.includes("fun") && isDone(c, "job"), done: (c) => isDone(c, "fun"),
      ask: (c) => askTopic(c, "fun", "fun_q"),
      expects: ["fun_ans", "fun_ctx", "fun_none", "ask_back", "q_fun"],
      suggest: [{ lt: "Papasakoti, ką veiki laisvalaikiu", hint: "fun", options: "hobby" }, { lt: "Paklausti Marko to paties", hint: "back" }],
      help: (c) => { done(c, "fun"); M(c, "fun_none"); } },
    { id: "reading", when: (c) => !!c.s.readsBooks, done: (c) => isDone(c, "reading"),
      ask: (c) => askTopic(c, "reading", "reading_q"),
      expects: ["book_ctx", "ask_back", "q_reading"],
      suggest: [{ lt: "Pasakyti, ką skaitai", hint: "reading" }, { lt: "Paklausti Marko to paties", hint: "back" }],
      help: (c) => { done(c, "reading"); M(c, "ok"); } },
    { id: "cafe", when: (c) => !!c.s.cafeTwist && isDone(c, "job"), done: (c) => isDone(c, "cafe"),
      ask: (c) => { c.twist("new_cafe"); askTopic(c, "cafe", "cafe_q"); },
      expects: ["cafe_ans_no", "cafe_ans_yes", "cafe_which"],
      suggest: [{ lt: "Atsakyti apie naują kavinę", hint: "cafe" }],
      yes: (c) => party.handlers.cafe_ans_yes(c, {}, { intent: "cafe_ans_yes", slots: {}, tags: [] }),
      no: (c) => party.handlers.cafe_ans_no(c, {}, { intent: "cafe_ans_no", slots: {}, tags: [] }) },
    { id: "your_turn", when: (c) => !c.s.askedBack && isDone(c, "job"), done: (c) => !!c.s.askedBack || !!c.s.turnSkipped,
      ask: (c) => { c.s.lastTopic = null; M(c, "your_turn"); M(c, "ask_me"); },
      expects: ["q_from", "q_job", "q_know", "q_time", "q_like", "q_fun", "q_live", "q_chef", "q_dance", "q_reading"],
      suggest: [{ lt: "Paklausti Marko apie jį patį", hint: "ask_mark" }],
      help: (c) => { c.s.turnSkipped = true; M(c, "just_tell"); } },
    { id: "drink2", when: (c) => !!c.s.plan.includes("drink2") && isDone(c, "job"), done: (c) => !!c.s.drink2Done,
      ask: (c) => M(c, "drink2_q"),
      expects: ["drink_ans", "drink2_yes", "drink_no"],
      suggest: [{ lt: "Sutikti arba padėkoti", hint: "drink", options: "drink" }],
      yes: (c) => { c.s.drink2Done = true; M(c, "drink2_ok"); },
      no: (c) => { c.s.drink2Done = true; M(c, "decline_ok"); } },
    { id: "numbers", when: (c) => isDone(c, "job"), done: (c) => !!c.s.numbersDone,
      ask: (c) => {
        if (!c.s.lateSaid) { c.s.lateSaid = true; M(c, "time_late"); M(c, "get_going"); M(c, "swap_q"); return; }
        M(c, "swap_reask");
      },
      expects: ["swap_propose", "number_give", "decline_number"],
      suggest: [{ lt: "Apsikeisti numeriais", hint: "numbers" }],
      yes: (c) => { M(c, "ask_number"); expectNumber(c); },
      no: (c) => { c.s.numbersDone = "declined"; M(c, "decline_ok"); } },
  ],

  init: (c) => {
    const plan = ["from", "job", "numbers"];
    if (c.chance(0.45)) plan.push("drink");
    if (c.chance(0.7)) plan.push("know");
    if (c.chance(0.7)) plan.push("time");
    if (c.chance(0.5)) plan.push("like");
    if (c.chance(0.8)) plan.push("fun");
    if (c.chance(0.4)) plan.push("drink2");
    c.s.plan = plan;
    c.s.mishearTwist = c.visits >= 1 && c.chance(0.4);
    c.s.cafeTwist = c.visits >= 1 && c.chance(0.4);
  },

  start: (c) => {
    SO(c, "sophie_open");
    M(c, "mark_hi");
    c.hold();
  },

  handlers: {
    intro_name(c, slots) {
      if (!live(c)) return;
      if (slots.name) c.s.nameGiven = true;
      if (c.s.named) return;
      c.s.named = true;
      M(c, "nice");
    },
    name_ctx(c, slots) {
      if (!live(c)) return;
      if (slots.name) c.s.nameGiven = true;
      if (c.s.named) return;
      c.s.named = true;
      M(c, "nice");
    },
    nice_meet(c) {
      if (!live(c)) return;
      if (c.s.named) { if (!quiet(c) && once(c, "nice")) M(c, "nice_too"); return; }
      if (/\b(i am|my name is)\b/i.test(c.heard)) { c.s.named = true; M(c, "nice_too"); return; }
      M(c, "whats_name"); c.hold();
    },
    ask_name(c) { if (!live(c)) return; M(c, "mark_name"); },
    drink_ans(c) {
      if (!live(c)) return;
      if (c.step === "drink2" || (c.s.drinkDone && c.s.plan.includes("drink2") && !c.s.drink2Done)) { c.s.drink2Done = true; M(c, "drink2_ok"); return; }
      c.s.drinkDone = true;
      if (once(c, "drink")) SO(c, "drink_ok");
    },
    drink_menu(c) { if (!live(c)) return; SO(c, "drink_menu"); },
    drink_no(c) {
      if (!live(c)) return;
      if (c.step === "drink2" || (c.s.drinkDone && c.s.plan.includes("drink2") && !c.s.drink2Done && c.step !== "drink")) { c.s.drink2Done = true; M(c, "decline_ok"); return; }
      if (c.step === "drink" || !c.s.drinkDone) { c.s.drinkDone = true; SO(c, "drink_no"); return; }
      M(c, "ok");
    },
    drink2_yes(c) { if (!live(c)) return; c.s.drink2Done = true; M(c, "drink2_ok"); },
    know_ans(c, slots, seg) {
      if (!live(c)) return;
      if (!once(c, "know")) return;
      done(c, "know");
      const tg = seg.tags;
      if (tg.includes("class") && slots.cls === "dance") { M(c, "know_dance"); c.s.told = { ...(c.s.told || {}), know: true }; return; }
      M(c, tg.includes("work") ? "know_work" : tg.includes("neigh") ? "know_neigh" : tg.includes("class") ? "know_class" : tg.includes("none") ? "know_none" : "know_friends");
    },
    from_ans(c, slots) { if (!live(c)) return; fromAnswer(c, slots); },
    from_ctx(c, slots) { if (!live(c)) return; fromAnswer(c, slots); },
    city_country(c, slots) { if (!live(c)) return; if (slots.country) reactCountry(c, slots.country); },
    correct_country(c, slots) {
      if (!live(c)) return;
      const list = ([] as string[]).concat(slots.country ?? []);
      // "Not Latvia, Lithuania" → the last one; "Lithuania, not Latvia" / "No, Lithuania, it's next to Latvia" → the first
      const txt = c.heard.toLowerCase().replace(/^[\s,.!]*((no|nope|sorry|oh)[\s,.!]+)*/, "");
      const right = /^not\b/.test(txt) && list.length > 1 ? list[list.length - 1] : list[0];
      if (!right) return;
      const fixed = !!c.s.country && c.s.country !== right;
      if (fixed) M(c, "mishear_fix", { X: right });
      reactCountry(c, right, fixed);
    },
    visit_invite(c) { if (!live(c)) return; M(c, "id_love_to"); },
    confirm_yes(c) { if (!live(c)) return; if (!quiet(c)) M(c, "ha"); },
    job_ans(c, slots, seg) { if (!live(c)) return; jobAnswer(c, slots, seg.tags); },
    job_ctx(c, slots) { if (!live(c)) return; jobAnswer(c, slots, slots.field ? ["field"] : []); },
    time_ans(c, slots) {
      if (!live(c)) return;
      if (!once(c, "time")) return;
      done(c, "time");
      const m = monthsFrom(slots.dur);
      M(c, m === Infinity ? "time_life" : m >= 7 ? "time_long" : m >= 3 ? "time_same" : "time_short");
      c.s.told = { ...(c.s.told || {}), time: true };
    },
    like_yes(c) { if (!live(c)) return; if (!once(c, "like")) return; done(c, "like"); M(c, "like_yes"); },
    like_mixed(c) { if (!live(c)) return; if (!once(c, "like")) return; done(c, "like"); M(c, "like_mixed"); },
    like_no(c) { if (!live(c)) return; if (!once(c, "like")) return; done(c, "like"); M(c, "like_no"); },
    fun_ans(c, slots, seg) { if (!live(c)) return; funAnswer(c, slots, seg.tags); },
    fun_ctx(c, slots) { if (!live(c)) return; funAnswer(c, slots); },
    fun_none(c) { if (!live(c)) return; done(c, "fun"); if (once(c, "fun_none")) M(c, "fun_none"); },
    book_ctx(c) { if (!live(c)) return; if (!once(c, "book")) return; done(c, "reading"); M(c, "reading_react"); },
    ask_back(c) {
      if (!live(c)) return;
      // "I work with Sophie. And you?": about what the learner has just told, else about Mark's last question
      const now = c.s.__toldNow?.t === turn(c) ? (c.s.__toldNow.topic as Topic) : null;
      const tp = now ?? (c.s.lastTopic as Topic | null) ?? (isDone(c, "from") ? "job" : "from");
      markAbout(c, tp);
    },
    q_from(c) { if (live(c)) markAbout(c, "from"); },
    q_job(c) { if (live(c)) markAbout(c, "job"); },
    q_know(c) { if (live(c)) markAbout(c, "know"); },
    q_time(c) { if (live(c)) markAbout(c, "time"); },
    q_like(c) { if (live(c)) markAbout(c, "like"); },
    q_fun(c) { if (live(c)) markAbout(c, "fun"); },
    q_reading(c) { if (live(c)) markAbout(c, "reading"); },
    q_live(c) { if (live(c)) markAbout(c, "live"); },
    q_chef(c) { if (!live(c)) return; c.s.askedBack = (c.s.askedBack || 0) + 1; M(c, /\bcafe\b/i.test(c.heard) ? "mark_job" : "mark_chef"); },
    q_dance(c) { if (!live(c)) return; c.s.askedBack = (c.s.askedBack || 0) + 1; c.s.danceTold = true; M(c, "mark_dance"); },
    q_lithuania(c) { if (!live(c)) return; c.s.askedBack = (c.s.askedBack || 0) + 1; M(c, "mark_lithuania"); },
    cafe_ans_no(c) {
      if (!live(c)) return;
      if (c.step !== "cafe" && !c.s.cafeTwist) { M(c, "ok"); return; }
      if (!once(c, "cafe")) return;
      done(c, "cafe"); M(c, "cafe_try"); M(c, "cafe_go_q"); expectCafeGo(c);
    },
    cafe_ans_yes(c) {
      if (!live(c)) return;
      if (c.step !== "cafe" && !c.s.cafeTwist) { M(c, "ok"); return; }
      if (!once(c, "cafe")) return;
      done(c, "cafe"); M(c, "cafe_great"); M(c, "cafe_go_q"); expectCafeGo(c);
    },
    cafe_which(c) { if (!live(c)) return; M(c, "cafe_which"); },
    agree_go(c) { if (!live(c)) return; M(c, isDone(c, "cafe") ? "cafe_go_yes" : "ok"); },
    swap_propose(c) {
      if (!live(c)) return;
      if (!once(c, "swap")) return;
      if (/\b((can|could|may) i|i will|i'll|let me) give you\b|\bdo you want my number\b/i.test(c.heard)) { M(c, "swap_sure"); M(c, "ask_number"); expectNumber(c); return; }
      M(c, "swap_sure"); M(c, "mark_number");
      c.s.markGaveNumber = true;
      c.s.numbersDone = true;
      maybeComplete(c);
    },
    number_give(c) {
      if (!live(c)) return;
      if (!once(c, "number")) return;
      c.s.numbersDone = true;
      M(c, "number_got");
      maybeComplete(c);
    },
    decline_number(c) { if (!live(c)) return; c.s.numbersDone = "declined"; M(c, "decline_ok"); maybeComplete(c); },
    bye_nice(c) { if (!live(c)) return; goodbye(c); },
    me_neither(c) { if (!live(c)) return; if (c.s.danceTold) M(c, "here_to_dancing"); else M(c, "ha"); },
    cute_mark(c) { if (!live(c)) return; M(c, "ha"); },
    g_bye(c) { if (!live(c)) return; goodbye(c); },
  },

  finish: (c) => {
    maybeComplete(c);
    M(c, "great_meet");
    const closing: Pending = {
      id: "closing", expects: ["bye_nice"], hints: ["bye"],
      suggest: [{ lt: "Atsisveikinti", hint: "bye" }],
      on: {
        bye_nice: (cc) => goodbye(cc, true),
        g_bye: (cc) => goodbye(cc, true),
        g_thanks: (cc) => goodbye(cc, true),
        nice_meet: (cc) => goodbye(cc, true),
        // "How are you?" at the very end: answer it, then back to the goodbye
        g_howareyou: (cc) => { M(cc, "g_howareyou_reply"); expectHowAreYou(cc, (x) => x.expect(closing)); },
      },
      yes: (cc) => goodbye(cc, true),
      no: (cc) => goodbye(cc, true),
    };
    c.expect(closing);
  },

  tests: [
    { say: "Hi, I'm Tomas. Nice to meet you!", intent: "intro_name", slots: { name: "Tomas" } },
    { say: "Nice to meet you too!", intent: "nice_meet" },
    { say: "Tomas", intent: "name_ctx", step: "name" },
    { say: "Can I have a lemonade, please?", intent: "drink_ans", slots: { drink: "lemonade" } },
    { say: "Just water, please.", intent: "drink_ans" },
    { say: "We work together.", intent: "know_ans" },
    { say: "We met at a dance class.", intent: "know_ans", slots: { cls: "dance" } },
    { say: "She's my neighbor.", intent: "know_ans" },
    { say: "She's an old friend.", intent: "know_ans" },
    { say: "I'm from Lithuania.", intent: "from_ans", slots: { country: "lithuania" } },
    { say: "I'm Lithuanian.", intent: "from_ans", slots: { country: "lithuania" } },
    { say: "Lithuania, by the sea.", intent: "from_ans" },
    { say: "Poland", intent: "from_ctx", step: "from" },
    { say: "I'm from Vilnius.", intent: "from_ans", slots: { city: "vilnius" } },
    { say: "No, Lithuania!", intent: "correct_country" },
    { say: "Not Latvia, Lithuania!", intent: "correct_country" },
    { say: "I'm a nurse.", intent: "job_ans", slots: { job: "nurse" } },
    { say: "I work as a software developer.", intent: "job_ans", slots: { job: "developer" } },
    { say: "I work in a hospital.", intent: "job_ans", slots: { field: "hospital" } },
    { say: "I'm retired.", intent: "job_ans" },
    { say: "I'm looking for a job right now.", intent: "job_ans" },
    { say: "About a year.", intent: "time_ans", step: "time" },
    { say: "I just moved here.", intent: "time_ans" },
    { say: "Since June.", intent: "time_ans", step: "time" },
    { say: "Yes, I love it!", intent: "like_yes", step: "like" },
    { say: "It's great, but I miss home.", intent: "like_mixed" },
    { say: "I don't really like it yet.", intent: "like_no", not: ["like_yes"] },
    { say: "I like running and reading.", intent: "fun_ans" },
    { say: "I love hiking.", intent: "fun_ans", slots: { hobbies: { hobby: "hiking" } } },
    { say: "I run, I read, I cook.", intent: "fun_ans" },
    { say: "I play basketball.", intent: "fun_ans" },
    { say: "I play football.", intent: "fun_ans" },
    { say: "Hiking", intent: "fun_ctx", step: "fun" },
    { say: "And you?", intent: "ask_back" },
    { say: "Where are you from?", intent: "q_from" },
    { say: "What do you do for fun?", intent: "q_fun" },
    { say: "How do you know Sophie?", intent: "q_know" },
    { say: "Let's swap numbers!", intent: "swap_propose" },
    { say: "Sure! Here's mine: 555-0142.", intent: "number_give" },
    { say: "Sorry, I don't really give out my number.", intent: "decline_number", not: ["number_give"] },
    { say: "It was great to meet you!", intent: "bye_nice" },
    { say: "Not yet!", intent: "cafe_ans_no", step: "cafe" },
    { say: "Me neither!", intent: "me_neither" },
    // more ways to say it (dev corpus tests/corpus/s63-party.json)
    { say: "Hi! Call me Tomas", intent: "intro_name", slots: { name: "Tomas" } },
    { say: "Pleased to meet you, I'm Tomas", intent: "intro_name", slots: { name: "Tomas" } },
    { say: "I am teacher", intent: "job_ans", slots: { job: "teacher" } },
    { say: "I am working like accountant", intent: "job_ans", slots: { job: "accountant" } },
    { say: "I drive a truck", intent: "job_ans" },
    { say: "I'm a pensioner", intent: "job_ans" },
    { say: "We met at yoga class", intent: "know_ans", slots: { cls: "yoga" } },
    { say: "We are colleagues", intent: "know_ans" },
    { say: "My country is Lithuania", intent: "from_ans", slots: { country: "lithuania" } },
    { say: "I live here five years", intent: "time_ans" },
    { say: "I moved here in 2023", intent: "time_ans", step: "time" },
    { say: "It's nice, but the weather is bad", intent: "like_mixed" },
    { say: "Yes, I'm very happy here", intent: "like_yes", step: "like", not: ["intro_name"] },
    { say: "In my free time I go swimming", intent: "fun_ans", step: "fun" },
    { say: "I like to spend time with my family", intent: "fun_ans", step: "fun" },
    { say: "No, I'm driving", intent: "drink_no", step: "drink2", not: ["intro_name"] },
    { say: "Yes, the same again", intent: "drink2_yes", step: "drink2" },
    { say: "Why did you move here?", intent: "q_time" },
    { say: "Give me your number", intent: "swap_propose" },
    { say: "Sorry, I don't give my number to strangers", intent: "decline_number", not: ["number_give"] },
    { say: "Lithuania, not Latvia", intent: "correct_country" },
    // meaning kept: negations never become the positive, and "I'm …" is not always a name
    { say: "No beer for me", intent: "drink_no", not: ["drink_ans"] },
    { say: "I don't like it here", intent: "like_no", step: "like", not: ["like_yes"] },
    { say: "I'm not from Lithuania", intent: "none" },
    { say: "I don't like running", intent: "none" },
    { say: "I'm hungry", intent: "none" },
    { say: "Lithuania", intent: "none" },
    { say: "purple tractor sings loudly", intent: "none" },
    // more ways (played paths, 25 Sep 2026)
    { say: "I don't know anyone here.", intent: "know_ans", step: "know" },
    { say: "I'm her neighbor.", intent: "know_ans", step: "know" },
    { say: "I know her from yoga.", intent: "know_ans", step: "know", slots: { cls: "yoga" } },
    { say: "We just met.", intent: "know_ans", step: "know" },
    { say: "I met her at the café.", intent: "know_ans", step: "know" },
    { say: "I'm new here.", intent: "time_ans", step: "time" },
    { say: "I'm not new here.", intent: "none", step: "time" },
    { say: "I work with computers.", intent: "job_ans", step: "job" },
    { say: "I don't work with computers.", intent: "none", step: "job" },
  ],

  sims: [
    // Mark's optional topics are pinned to the ones the script answers; no drink before "how do you know Sophie?",
    // no mishearing ("Yes, that's right!" answers "That's by the Baltic Sea, right?")
    { name: "reciprocal small talk", turns: ["Hi, I'm Tomas. Nice to meet you!", "We work together. And you?", "I'm from Lithuania. How about you?", "Yes, that's right!", "I'm a nurse. And what do you do?", "About a year.", "Yes, I love it! People are so friendly.", "I like running and reading.", "A funny travel book.", "Sure! Here's mine: 555-0142.", "It was great to meet you too!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.plan = s.plan.filter((k: string) => k !== "drink"); for (const k of ["know", "time", "like", "fun"]) if (!s.plan.includes(k)) s.plan.push(k); s.mishearTwist = false; } },
    // every topic the short answers answer, then "Your turn!" (no café question to ask back at), "No, thanks." to another drink
    { name: "short answers, Mark prompts", turns: ["Nice to meet you!", "Tomas.", "Lithuania.", "Yes.", "A teacher.", "Two months.", "It's okay.", "Hiking.", "What do you do for fun?", "No, thanks.", "Sure!", "It's 555-0199.", "Bye!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { for (const k of ["time", "like", "fun", "drink2"]) if (!s.plan.includes(k)) s.plan.push(k); s.mishearTwist = false; s.cafeTwist = false; } },
    { name: "learner leads", turns: ["Hi Mark, I'm Tomas. Where are you from?", "I'm from Vilnius.", "It's the capital of Lithuania.", "You should visit!", "I work in a hospital.", "I'm a doctor.", "Since May.", "Can I get your number?", "See you around!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { if (!s.plan.includes("time")) s.plan.push("time"); } },
    // "I work with Sophie. And you?" before Mark asks: "And you?" is about how Mark knows Sophie
    { name: "volunteers a fact and asks back", turns: ["Hi, I'm Tomas. I work with Sophie. And you?", "I'm from Lithuania. And you?", "Yes, it is!", "I'm a teacher. What about you?", "I like hiking. And you?", "Sure! It's 555-0142.", "Nice to meet you too! Bye!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.plan = ["from", "job", "numbers", "know", "fun"]; s.mishearTwist = false; s.cafeTwist = false; } },
    // the twist on every seed: "Oh, Latvia? Cool!" and the learner corrects Mark
    { name: "twist: Mark mishears the country", turns: ["Hi, I'm Tomas. Nice to meet you!", "I'm from Lithuania.", "No, not Latvia. Lithuania!", "Yes, that's right!", "I'm a teacher.", "Sure! It's 555-0142.", "Bye!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.plan = ["from", "job", "numbers", "know"]; s.mishearTwist = true; s.cafeTwist = false; } },
  ],
};

// ---------------------------------------------------------------------------
// Answer helpers (after the object so they can call party.*)

function fromAnswer(c: Ctx, slots: any) {
  if (!once(c, "from")) return;
  const ctry = ([] as string[]).concat(slots.country ?? [])[0];
  if (!ctry && slots.city) {
    c.s.city = slots.city;
    deferOrAsk(c, (cx) => cityQ(cx));
    return;
  }
  if (!ctry) return;
  if (c.s.mishearTwist && MISHEAR[ctry] && !c.s.misheard) {
    c.s.misheard = true;
    c.twist("mishear");
    c.s.country = MISHEAR[ctry];
    M(c, "mishear", { X: MISHEAR[ctry] });
    deferOrAsk(c, (cx) => mishearQ(cx, ctry));
    return;
  }
  reactCountry(c, ctry);
}

function cityQ(c: Ctx) {
    M(c, "city_where");
    c.expect({
      id: "city_q", expects: ["city_country", "from_ctx", "from_ans"], hints: ["city"],
      suggest: [{ lt: "Paaiškinti, kur tas miestas", hint: "city", options: "country" }],
      on: {
        city_country: (cc, sl) => { if (sl.country) reactCountry(cc, sl.country); },
        from_ctx: (cc, sl) => { if (sl.country) reactCountry(cc, ([] as string[]).concat(sl.country)[0]); },
        from_ans: (cc, sl) => { if (sl.country) reactCountry(cc, ([] as string[]).concat(sl.country)[0]); },
      },
      ask: (cc) => M(cc, "city_where"),
    });
}

function mishearQ(c: Ctx, ctry: string) {
    c.expect({
      id: "mishear", expects: ["correct_country", "from_ctx", "from_ans"], hints: ["mishear"],
      suggest: [{ lt: "Pataisyti Marką", hint: "mishear" }],
      yes: (cc) => { done(cc, "from"); cc.s.country = MISHEAR[ctry]; },
      no: (cc) => { M(cc, "mishear_again"); cc.hold(); cc.s.misheardNo = true; },
      on: {
        correct_country: (cc, sl, sg) => party.handlers.correct_country(cc, sl, sg),
        from_ctx: (cc, sl) => { const r = ([] as string[]).concat(sl.country ?? [])[0]; if (r) { M(cc, "mishear_fix", { X: r }); reactCountry(cc, r, true); } },
        from_ans: (cc, sl) => { const r = ([] as string[]).concat(sl.country ?? [])[0]; if (r) { M(cc, "mishear_fix", { X: r }); reactCountry(cc, r, true); } },
        confirm_yes: (cc) => { done(cc, "from"); },
      },
      ask: (cc) => M(cc, "mishear_again"),
    });
}

function jobAnswer(c: Ctx, slots: any, tags: string[]) {
  if (!once(c, "job")) return;
  // "I drive a truck" / "I teach English": the job comes from what the learner does (#j:<job>)
  const byWork = tags.find((x) => x.startsWith("j:"))?.slice(2);
  if (byWork && !slots.job) slots = { ...slots, job: byWork };
  if (tags.includes("retired")) { done(c, "job"); M(c, "retired_react"); return; }
  if (tags.includes("looking")) { done(c, "job"); M(c, "looking_react"); return; }
  if (tags.includes("home")) { done(c, "job"); M(c, "home_react"); return; }
  if (tags.includes("own")) { done(c, "job"); M(c, "own_react"); return; }
  if (tags.includes("generic") && !slots.job) { done(c, "job"); M(c, "ok"); return; }
  if (tags.includes("student") || slots.job === "student") { done(c, "job"); M(c, "student_react"); return; }
  if (slots.job) {
    done(c, "job");
    if (slots.job === "chef") { M(c, "job_chef"); return; }
    M(c, "job_react", { X: jobVar(c, slots.job) });
    return;
  }
  if (slots.field || tags.includes("field")) {
    deferOrAsk(c, (cx) => fieldQ(cx));
  }
}

function fieldQ(c: Ctx) {
    M(c, "field_q");
    c.expect({
      id: "field_q", expects: ["job_ans", "job_ctx"], hints: ["job"],
      suggest: [{ lt: "Pasakyti, kuo dirbi", hint: "job", options: "job" }],
      on: {
        job_ans: (cc, sl, sg) => { cc.s["__once_job"] = null; jobAnswer(cc, sl, sg.tags.filter((x) => x !== "field")); if (!isDone(cc, "job")) done(cc, "job"); },
        job_ctx: (cc, sl) => { cc.s["__once_job"] = null; if (sl.job) jobAnswer(cc, sl, []); done(cc, "job"); },
      },
      no: (cc) => { done(cc, "job"); M(cc, "ok"); },
      yes: (cc) => { done(cc, "job"); M(cc, "ok"); },
    });
}

function funAnswer(c: Ctx, slots: any, tags: string[] = []) {
  const list: string[] = [];
  const hb = slots.hobbies?.hobby ?? slots.hobby;
  for (const h of ([] as any[]).concat(hb ?? [])) if (typeof h === "string") list.push(h);
  for (const v of ([] as any[]).concat(slots.hv ?? [])) if (typeof v === "string") list.push(v);
  // "I like to spend time with my family": a pastime that is not on the list
  if (!list.length && tags.includes("other") && once(c, "fun")) { done(c, "fun"); M(c, "fun_generic"); return; }
  if (!list.length) return;
  c.s.hobbies = [...new Set([...(c.s.hobbies || []), ...list])];
  if (/\bfootball\b/i.test(c.heard)) c.tip(party.tips!.us_soccer);
  if (list.includes("reading")) c.s.readsBooks = true;
  if (!once(c, "fun")) return;
  done(c, "fun");
  const shared = list.find((h) => byHobby(h)?.attrs?.mark);
  if (list.includes("cooking")) { M(c, "fun_cooking"); return; }
  if (list.includes("basketball") && c.s.country === "lithuania") {
    M(c, "fun_basketball");
    c.expect({ id: "basketball_q", optional: true, expects: ["confirm_yes"], hints: ["agree"], suggest: [{ lt: "Patvirtinti", hint: "agree" }], yes: (cc) => M(cc, "knew_it"), no: (cc) => M(cc, "ha"), on: { confirm_yes: (cc) => M(cc, "knew_it") } });
    return;
  }
  if (list.includes("mushrooms")) { M(c, "fun_mushrooms"); return; }
  if (list.includes("dancing")) { M(c, "fun_dancing"); return; }
  if (shared) { M(c, "fun_shared", { X: shared }); return; }
  M(c, "fun_generic");
}

/** Months since the learner arrived (Infinity = born here). */
function monthsFrom(d: any): number {
  if (!d) return 6;
  const tg: string[] = d.__tags || [];
  const n = typeof d.number === "number" ? d.number : 1;
  if (tg.includes("life")) return Infinity;
  if (tg.includes("short")) return 0;
  if (tg.includes("y15")) return 18;
  if (tg.includes("y1") || tg.includes("ago1") && /year/.test(JSON.stringify(d))) return 12;
  if (tg.includes("y") || tg.includes("yfew")) return 12 * (tg.includes("yfew") ? 3 : n);
  if (tg.includes("mo6")) return 6;
  if (tg.includes("mofew")) return 3;
  if (tg.includes("mo1")) return 1;
  if (tg.includes("mo")) return n;
  if (tg.includes("w") || tg.includes("w1")) return 0;
  if (tg.includes("since")) { const m = Number(d.month) || NOW_MONTH; return ((NOW_MONTH - m) + 12) % 12; }
  if (tg.includes("yr")) { const y = Number(d.year) || NOW_YEAR; return Math.max(0, (NOW_YEAR - y) * 12); }
  if (tg.includes("ago")) return n;
  if (tg.includes("ago1")) return 1;
  return 6;
}

function expectCafeGo(c: Ctx) {
  c.expect({
    id: "cafe_go", expects: ["agree_go"], hints: ["cafe_go"],
    suggest: [{ lt: "Sutikti nueiti kartu", hint: "cafe_go" }],
    yes: (cc) => M(cc, "cafe_go_yes"),
    no: (cc) => M(cc, "cafe_go_no"),
    on: { agree_go: (cc) => M(cc, "cafe_go_yes") },
  });
}

function expectNumber(c: Ctx) {
  c.expect({
    id: "ask_number", expects: ["number_give", "decline_number"], hints: ["my_number"],
    suggest: [{ lt: "Pasakyti savo numerį", hint: "my_number" }],
    on: {
      number_give: (cc, sl, sg) => party.handlers.number_give(cc, sl, sg),
      decline_number: (cc, sl, sg) => party.handlers.decline_number(cc, sl, sg),
    },
    ask: (cc) => M(cc, "ask_number"),
  });
}

function goodbye(c: Ctx, afterFinish = false) {
  if (c.s.byeSaid) return;
  maybeComplete(c);
  c.s.byeSaid = true;
  if (!afterFinish) M(c, "great_meet");
  M(c, "see_around");
  if (c.chance(0.5)) SO(c, "sophie_bye");
  c.hold();
  c.end();
}

export default party;
