// The people of Maple Harbor. Voices are Kokoro-82M American voices (Apache-2.0), rendered
// in advance by tools/build-audio.ts. `informal` NPCs address the player with Lithuanian "tu".
import type { NpcInfo } from "../convo/dialogue";

export type HairStyle = "short" | "long" | "bun" | "ponytail" | "curly" | "bald" | "buzz" | "bob" | "wavy" | "side";
export type Accessory = "apron" | "cap" | "glasses" | "sunglasses" | "hat" | "tie" | "beard" | "mustache" | "headset" | "scarf"
  | "badge" | "police" | "vest" | "bowtie" | "earrings" | "pilot" | "chef" | "cardigan" | "lanyard" | "flower";

export interface Look {
  skin: string;
  hair: { style: HairStyle; color: string };
  top: string;
  bottom: string;
  shoes?: string;
  skirt?: boolean;
  acc?: Accessory[];
  accColor?: string;
  height?: number;
  build?: number;
}

export interface NpcDef extends NpcInfo {
  role: { en: string; lt: string };
  look: Look;
  bio?: string;
}

const SK = { light: "#f2d3bd", fair: "#f6dcc8", tan: "#d9a47e", olive: "#c68e63", brown: "#a0694a", dark: "#6e4630", deep: "#4f3223" };
const HAIR = { black: "#1f1a17", brown: "#5a3a25", chestnut: "#7b4a2a", blonde: "#d9b36a", red: "#a8472a", gray: "#b8b3ac", white: "#e8e4dc", auburn: "#8a3b24" };

const N = (id: string, name: string, role: [string, string], gender: "m" | "f", voice: string, look: Look, extra: Partial<NpcDef> = {}): NpcDef =>
  ({ id, name, role: { en: role[0], lt: role[1] }, gender, voice, look, ...extra });

export const NPCS: Record<string, NpcDef> = Object.fromEntries([
  // Arrival
  N("diaz", "Officer Diaz", ["Passport control", "Pasų kontrolė"], "f", "af_kore",
    { skin: SK.olive, hair: { style: "bun", color: HAIR.black }, top: "#2f4a6b", bottom: "#1f2d40", acc: ["police", "badge"] }, { bio: "Griežta, bet teisinga pareigūnė." }),
  N("priya", "Priya", ["Baggage services", "Bagažo tarnyba"], "f", "af_nova",
    { skin: SK.brown, hair: { style: "ponytail", color: HAIR.black }, top: "#e05a47", bottom: "#2b2b3a", acc: ["lanyard", "earrings"] }),
  N("vinnie", "Vinnie", ["Taxi driver", "Taksi vairuotojas"], "m", "am_puck",
    { skin: SK.light, hair: { style: "short", color: HAIR.gray }, top: "#f2c230", bottom: "#3b3b46", acc: ["cap", "mustache"], build: 1.12 }, { bio: "Dainuoja kartu su radiju." }),
  N("olivia", "Olivia", ["Hotel reception", "Viešbučio registratūra"], "f", "af_sarah",
    { skin: SK.fair, hair: { style: "bob", color: HAIR.chestnut }, top: "#2d5d5b", bottom: "#23303a", acc: ["badge", "earrings"] }),
  N("chuck", "Chuck", ["Visitor Center volunteer", "Lankytojų centro savanoris"], "m", "am_michael",
    { skin: SK.light, hair: { style: "bald", color: HAIR.gray }, top: "#6d8f3e", bottom: "#4a3b2c", acc: ["glasses", "vest", "mustache"], build: 1.1 }, { speed: 1.18, bio: "Kalba labai greitai – paprašyk sulėtinti!" }),
  // Downtown
  N("mia", "Mia", ["Barista", "Barista"], "f", "af_bella",
    { skin: SK.tan, hair: { style: "ponytail", color: HAIR.brown }, top: "#f4efe6", bottom: "#394150", acc: ["apron"], accColor: "#2f7d6b" }, { bio: "Piešia širdeles ant kavos putų." }),
  N("rosa", "Rosa", ["Local, born and raised", "Vietinė gyventoja"], "f", "af_aoede",
    { skin: SK.olive, hair: { style: "bun", color: HAIR.white }, top: "#b5485d", bottom: "#3a3550", acc: ["glasses", "cardigan"], accColor: "#e8c07a", height: 0.93 }, { bio: "Visą gyvenimą gyvena Maple Harbore." }),
  N("ben", "Ben", ["Museum tickets", "Muziejaus kasa"], "m", "am_liam",
    { skin: SK.dark, hair: { style: "buzz", color: HAIR.black }, top: "#6b4a8a", bottom: "#23232e", acc: ["lanyard"] }),
  N("harold", "Harold", ["Museum guard", "Muziejaus prižiūrėtojas"], "m", "am_onyx",
    { skin: SK.fair, hair: { style: "short", color: HAIR.white }, top: "#2d3a55", bottom: "#23283a", acc: ["badge", "hat"], accColor: "#2d3a55", build: 1.08 }),
  N("marco", "Marco", ["Server", "Padavėjas"], "m", "am_michael",
    { skin: SK.olive, hair: { style: "wavy", color: HAIR.black }, top: "#f7f5f0", bottom: "#1c1c22", acc: ["bowtie", "apron"], accColor: "#1c1c22" }),
  N("chloe", "Chloe", ["Sales assistant", "Pardavėja konsultantė"], "f", "af_nicole",
    { skin: SK.fair, hair: { style: "long", color: HAIR.blonde }, top: "#e8a0b4", bottom: "#f2efe8", acc: ["badge", "earrings"] }),
  N("okafor", "Mr. Okafor", ["Pharmacist", "Vaistininkas"], "m", "am_fenrir",
    { skin: SK.deep, hair: { style: "buzz", color: HAIR.black }, top: "#f4f6f8", bottom: "#3a4252", acc: ["glasses", "badge"] }, { bio: "Kantrus ir labai rūpestingas." }),
  N("jessie", "Jessie", ["Hairdresser", "Kirpėja"], "f", "af_sky",
    { skin: SK.light, hair: { style: "side", color: HAIR.red }, top: "#262630", bottom: "#262630", acc: ["apron", "earrings"], accColor: "#c94f7c" }, { bio: "Kerpa ir pasakoja apie savo katę." }),
  N("aaron", "Aaron", ["Bank teller", "Banko darbuotojas"], "m", "am_liam",
    { skin: SK.tan, hair: { style: "side", color: HAIR.brown }, top: "#dfe7f2", bottom: "#2b3445", acc: ["tie", "badge"], accColor: "#1f4f8a" }),
  N("gloria", "Gloria", ["Postal clerk", "Pašto darbuotoja"], "f", "af_alloy",
    { skin: SK.brown, hair: { style: "curly", color: HAIR.black }, top: "#2c4f8f", bottom: "#27324a", acc: ["glasses", "badge"], build: 1.08 }),
  N("marco_host", "Lucia", ["Restaurant host", "Restorano administratorė"], "f", "af_kore",
    { skin: SK.olive, hair: { style: "long", color: HAIR.black }, top: "#8a1f2a", bottom: "#1c1c22", acc: ["earrings"] }),
  // Getting around
  N("walter", "Walter", ["Ticket office", "Bilietų kasa"], "m", "am_echo",
    { skin: SK.fair, hair: { style: "short", color: HAIR.gray }, top: "#7a2e2e", bottom: "#2d2d36", acc: ["glasses", "hat", "vest"], accColor: "#7a2e2e", height: 0.96 }),
  N("denise", "Denise", ["Bus driver", "Autobuso vairuotoja"], "f", "af_aoede",
    { skin: SK.dark, hair: { style: "short", color: HAIR.black }, top: "#3d6fb5", bottom: "#2a3340", acc: ["badge"] }),
  N("jake", "Jake", ["Car rental agent", "Automobilių nuoma"], "m", "am_eric",
    { skin: SK.light, hair: { style: "short", color: HAIR.blonde }, top: "#1f8a70", bottom: "#2d3440", acc: ["badge"] }),
  N("dot", "Dot", ["Gas station cashier", "Degalinės kasininkė"], "f", "af_kore",
    { skin: SK.fair, hair: { style: "curly", color: HAIR.auburn }, top: "#d94b3d", bottom: "#2e3a4a", acc: ["cap"], accColor: "#d94b3d" }),
  N("kevin", "Kevin", ["Airline check-in", "Registracija skrydžiui"], "m", "am_fenrir",
    { skin: SK.tan, hair: { style: "side", color: HAIR.black }, top: "#1d3f73", bottom: "#1d2536", acc: ["tie", "badge"], accColor: "#c9a227" }),
  N("grant", "Officer Grant", ["Airport security", "Oro uosto apsauga"], "m", "am_onyx",
    { skin: SK.brown, hair: { style: "buzz", color: HAIR.black }, top: "#e9edf2", bottom: "#1f2633", acc: ["badge"], build: 1.12 }),
  N("nina", "Nina", ["Gate agent", "Vartų darbuotoja"], "f", "af_sarah",
    { skin: SK.light, hair: { style: "bun", color: HAIR.blonde }, top: "#1d3f73", bottom: "#1d2536", acc: ["scarf", "badge"], accColor: "#c9a227" }),
  // Settling in
  N("linda", "Linda", ["Dental office reception", "Odontologijos klinikos registratūra"], "f", "af_nova",
    { skin: SK.fair, hair: { style: "bob", color: HAIR.brown }, top: "#8fc1c9", bottom: "#394150", acc: ["headset", "glasses"] }),
  N("claire", "Claire", ["NetWave customer service", "„NetWave“ klientų aptarnavimas"], "f", "af_kore",
    { skin: SK.tan, hair: { style: "ponytail", color: HAIR.chestnut }, top: "#5b3e8f", bottom: "#2a2a35", acc: ["headset"] }),
  N("netwave_bot", "NetWave", ["Automated phone menu", "Automatinis telefono meniu"], "f", "af_river",
    { skin: SK.fair, hair: { style: "bald", color: HAIR.gray }, top: "#5b3e8f", bottom: "#2a2a35" }),
  N("patel", "Mr. Patel", ["Landlord", "Buto savininkas"], "m", "am_eric",
    { skin: SK.brown, hair: { style: "short", color: HAIR.gray }, top: "#9a7b4f", bottom: "#3a352e", acc: ["glasses", "mustache"], build: 1.08 }),
  N("rita", "Rita", ["Neighbor", "Kaimynė"], "f", "af_jessica",
    { skin: SK.light, hair: { style: "curly", color: HAIR.red }, top: "#f0a35e", bottom: "#4a5a7a", acc: ["earrings"] }, { informal: true, bio: "Draugiška kaimynė iš gretimo buto." }),
  // Work
  N("brooks", "Ms. Brooks", ["HR manager, Brightline", "Personalo vadovė, „Brightline“"], "f", "af_sarah",
    { skin: SK.dark, hair: { style: "bob", color: HAIR.black }, top: "#2f3d58", bottom: "#2f3d58", acc: ["glasses", "earrings"] }),
  N("maria", "Maria", ["Coworker", "Kolegė"], "f", "af_nicole",
    { skin: SK.olive, hair: { style: "wavy", color: HAIR.brown }, top: "#e3b448", bottom: "#33394a", acc: ["lanyard"] }, { informal: true }),
  N("kate", "Kate", ["Team lead", "Komandos vadovė"], "f", "af_bella",
    { skin: SK.fair, hair: { style: "ponytail", color: HAIR.blonde }, top: "#4a7bb7", bottom: "#2a2f3a", acc: ["headset"] }, { informal: true }),
  N("paul", "Paul", ["Colleague", "Kolega"], "m", "am_eric",
    { skin: SK.tan, hair: { style: "short", color: HAIR.brown }, top: "#8a5a3a", bottom: "#2a2f3a", acc: ["glasses", "beard"] }, { informal: true }),
  N("sara", "Sara", ["Colleague", "Kolegė"], "f", "af_nova",
    { skin: SK.brown, hair: { style: "curly", color: HAIR.black }, top: "#c24f6a", bottom: "#2a2f3a" }, { informal: true }),
  N("harris", "Mr. Harris", ["Your boss", "Tavo viršininkas"], "m", "am_fenrir",
    { skin: SK.light, hair: { style: "side", color: HAIR.gray }, top: "#dfe3ea", bottom: "#2b2f3b", acc: ["tie", "glasses"], accColor: "#8a2432" }),
  // People
  N("sophie", "Sophie", ["Party host", "Vakarėlio šeimininkė"], "f", "af_nicole",
    { skin: SK.fair, hair: { style: "wavy", color: HAIR.auburn }, top: "#5fb3a3", bottom: "#f2efe8", skirt: true, acc: ["earrings"] }, { informal: true }),
  N("mark", "Mark", ["Party guest, chef", "Svečias, virėjas"], "m", "am_puck",
    { skin: SK.tan, hair: { style: "short", color: HAIR.black }, top: "#e07b39", bottom: "#394150", acc: ["beard"] }, { informal: true, bio: "Virėjas kavinėje, šokti nemoka." }),
  N("lizzie", "Lizzie", ["Your friend", "Tavo draugė"], "f", "af_sky",
    { skin: SK.light, hair: { style: "ponytail", color: HAIR.red }, top: "#8bc34a", bottom: "#3f51b5" }, { informal: true }),
  N("sam", "Sam", ["Your date", "Pasimatymas"], "m", "am_puck",
    { skin: SK.olive, hair: { style: "wavy", color: HAIR.brown }, top: "#3b5ba5", bottom: "#2b2f3b", acc: ["beard"] }, { informal: true }),
  N("emma", "Emma", ["Your date", "Pasimatymas"], "f", "af_nicole",
    { skin: SK.fair, hair: { style: "long", color: HAIR.chestnut }, top: "#b23a5a", bottom: "#2b2f3b", skirt: true, acc: ["earrings"] }, { informal: true }),
  N("dan", "Dan", ["Your friend, dinner host", "Draugas, vakarienės šeimininkas"], "m", "am_michael",
    { skin: SK.brown, hair: { style: "short", color: HAIR.black }, top: "#6a8caf", bottom: "#3a3f4a", acc: ["glasses"] }, { informal: true }),
  N("nora", "Nora", ["Dan's wife", "Dano žmona"], "f", "af_aoede",
    { skin: SK.light, hair: { style: "bun", color: HAIR.blonde }, top: "#d98b5f", bottom: "#4a4a5a", skirt: true }, { informal: true }),
  N("lucy", "Lucy", ["Old school friend", "Sena mokyklos draugė"], "f", "af_bella",
    { skin: SK.fair, hair: { style: "bob", color: HAIR.blonde }, top: "#ef8354", bottom: "#2d3142", acc: ["sunglasses", "scarf"], accColor: "#4f5d75" }, { informal: true }),
  N("mrs_lee", "Mrs. Lee", ["Flower stall", "Gėlių prekystalis"], "f", "af_alloy",
    { skin: SK.tan, hair: { style: "short", color: HAIR.gray }, top: "#7fb069", bottom: "#4a4a5a", acc: ["apron", "glasses"], accColor: "#e6aa68", height: 0.94 }),
  N("reyes", "Officer Reyes", ["Police officer", "Policininkas"], "m", "am_onyx",
    { skin: SK.olive, hair: { style: "buzz", color: HAIR.black }, top: "#2a3f66", bottom: "#1d2940", acc: ["police", "badge"] }),
  // Songs 31–35
  N("carter", "Dr. Carter", ["Family doctor", "Šeimos gydytoja"], "f", "af_sarah",
    { skin: SK.brown, hair: { style: "bun", color: HAIR.black }, top: "#f4f6f8", bottom: "#2f4a6b", acc: ["glasses", "badge"] }, { bio: "Rami ir kruopšti šeimos gydytoja." }),
  N("marcus", "Marcus", ["Cashier", "Kasininkas"], "m", "am_puck",
    { skin: SK.dark, hair: { style: "buzz", color: HAIR.black }, top: "#2e8b57", bottom: "#2b2f3b", acc: ["apron", "badge"], accColor: "#1f5f3c" }),
  N("sco", "Self-checkout", ["Self-checkout machine", "Savitarnos kasa"], "f", "af_river",
    { skin: SK.fair, hair: { style: "bald", color: HAIR.gray }, top: "#2e8b57", bottom: "#2b2f3b" }),
  N("frank", "Frank", ["Neighbor", "Kaimynas"], "m", "am_michael",
    { skin: SK.light, hair: { style: "short", color: HAIR.white }, top: "#6b8e5a", bottom: "#3a3f4a", acc: ["glasses", "hat"], accColor: "#5b4636", build: 1.05 }, { informal: true, bio: "Išėjęs į pensiją, mėgsta pasikalbėti apie orus." }),
  N("jordan", "Jordan", ["Personal trainer", "Asmeninė trenerė"], "f", "af_bella",
    { skin: SK.tan, hair: { style: "ponytail", color: HAIR.black }, top: "#1f8a8a", bottom: "#23232e", acc: ["badge"] }, { informal: true, bio: "Energinga trenerė, visada šypsosi." }),
].map((n) => [n.id, n]));

/** Voice used for English hint examples (the learner's "model" voice). */
export const COACH_VOICE = "af_heart";
