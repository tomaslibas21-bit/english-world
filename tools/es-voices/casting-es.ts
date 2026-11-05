// Casting for Puerto Colibrí's Gemini voices (docs/es/VOICES.md): every character of the Spanish edition gets one
// of Gemini's prebuilt voices, of the right gender, and keeps it in every conversation (voice id es_<npcId>); people
// who meet in one conversation never share a voice, and people met one after another (the airport, the services
// street, the office) are spread over different voices. The two coach voices (the learner's example answers) belong
// to no character, so a model answer never sounds like the person the learner talks to.
// Each role has a direction: age, manner (warmth), pace. Every line is recorded in two accents with the same voice
// and manner (the learner's Settings choice picks the set, src/editions/es/content/voices.ts): Mexican Spanish as it
// sounds on Mexico's Caribbean coast (es_<id>) and neutral Latin American Spanish (esn_<id>); only the accent
// direction differs. Some conversations add a setting (SCENES): a phone call, a video call, a hushed museum, a market
// stall, a brisk airport, a party. The direction goes to Gemini as speech_metadata.style (never read aloud).
//   EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/voice-casting-es.ts   (the table)
import { NPCS } from "../../src/content/npcs";
import { SITUATIONS } from "../../src/content/situations";

/** Gemini's prebuilt voices with Google's one-word descriptions; the gender is how they usually sound. */
export const VOICES: { name: string; g: "f" | "m"; trait: string }[] = [
  { name: "Zephyr", g: "f", trait: "bright" }, { name: "Kore", g: "f", trait: "firm" }, { name: "Leda", g: "f", trait: "youthful" },
  { name: "Aoede", g: "f", trait: "breezy" }, { name: "Callirrhoe", g: "f", trait: "easy-going" }, { name: "Autonoe", g: "f", trait: "bright" },
  { name: "Despina", g: "f", trait: "smooth" }, { name: "Erinome", g: "f", trait: "clear" }, { name: "Laomedeia", g: "f", trait: "upbeat" },
  { name: "Achernar", g: "f", trait: "soft" }, { name: "Gacrux", g: "f", trait: "mature" }, { name: "Pulcherrima", g: "f", trait: "forward" },
  { name: "Vindemiatrix", g: "f", trait: "gentle" }, { name: "Sulafat", g: "f", trait: "warm" },
  { name: "Puck", g: "m", trait: "upbeat" }, { name: "Charon", g: "m", trait: "informative" }, { name: "Fenrir", g: "m", trait: "excitable" },
  { name: "Orus", g: "m", trait: "firm" }, { name: "Enceladus", g: "m", trait: "breathy" }, { name: "Iapetus", g: "m", trait: "clear" },
  { name: "Umbriel", g: "m", trait: "easy-going" }, { name: "Algieba", g: "m", trait: "smooth" }, { name: "Algenib", g: "m", trait: "gravelly" },
  { name: "Rasalgethi", g: "m", trait: "informative" }, { name: "Alnilam", g: "m", trait: "firm" }, { name: "Schedar", g: "m", trait: "even" },
  { name: "Achird", g: "m", trait: "friendly" }, { name: "Zubenelgenubi", g: "m", trait: "casual" }, { name: "Sadachbia", g: "m", trait: "lively" },
  { name: "Sadaltager", g: "m", trait: "knowledgeable" },
];

/** Google's catalog voices from Mexico (GET /v1beta/voices: language es-419, accent "Mexico Spanish"; prebuilt, they
 *  work with gemini-3.8-flash-tts): native Mexican Spanish speakers, with the age and manner Google gives them. The
 *  30 voices above are listed as General American English voices. */
export const MX_VOICES: { name: string; g: "f" | "m" | "n"; age: number; trait: string }[] = [
  { name: "es-419-advisor-4", g: "f", age: 40, trait: "professional yet approachable" },
  { name: "es-419-advisor-6", g: "f", age: 35, trait: "cool, confident, collaborative" },
  { name: "es-419-advisor-7", g: "f", age: 32, trait: "professional yet approachable" },
  { name: "es-419-assistant-1", g: "f", age: 25, trait: "highly approachable" },
  { name: "es-419-assistant-2", g: "f", age: 39, trait: "laid-back, encouraging, chill" },
  { name: "es-419-assistant-6", g: "f", age: 47, trait: "professional yet approachable" },
  { name: "es-419-commercial-6", g: "f", age: 23, trait: "deep, velvety, unhurried" },
  { name: "es-419-commercial-8", g: "f", age: 24, trait: "confident and clear" },
  { name: "es-419-commercial-9", g: "f", age: 28, trait: "objective, direct, helpful" },
  { name: "es-419-concierge-5", g: "f", age: 39, trait: "confident and clear (an assistant on the phone)" },
  { name: "es-419-csagent-7", g: "f", age: 31, trait: "bright, breezy, youthful" },
  { name: "es-419-podcaster-2", g: "f", age: 25, trait: "a radio host: professional yet approachable" },
  { name: "es-419-training-7", g: "f", age: 25, trait: "intimate, a talk show" },
  { name: "es-419-training-8", g: "f", age: 32, trait: "bright, breezy, youthful" },
  { name: "es-419-tutor-3", g: "f", age: 56, trait: "a professor: highly approachable" },
  { name: "es-419-csagent-8", g: "n", age: 63, trait: "light, airy, precise" },
  { name: "es-419-assistant-9", g: "m", age: 28, trait: "crisp and eager" },
  { name: "es-419-commercial-1", g: "m", age: 24, trait: "professional yet approachable" },
  { name: "es-419-commercial-11", g: "m", age: 27, trait: "professional yet approachable" },
  { name: "es-419-commercial-12", g: "m", age: 23, trait: "confident and clear" },
  { name: "es-419-commercial-4", g: "m", age: 21, trait: "textured, resonant, soothing" },
  { name: "es-419-concierge-2", g: "m", age: 61, trait: "a tour guide: confident and clear" },
  { name: "es-419-concierge-7", g: "m", age: 59, trait: "a tour guide: objective, direct, helpful" },
  { name: "es-419-concierge-8", g: "m", age: 42, trait: "a tour guide: conversational, dry humor, warm" },
  { name: "es-419-csagent-4", g: "m", age: 44, trait: "bright, breezy, youthful" },
  { name: "es-419-csagent-9", g: "m", age: 57, trait: "textured, resonant, soothing" },
  { name: "es-419-podcaster-1", g: "m", age: 37, trait: "a radio host: professional yet approachable" },
  { name: "es-419-podcaster-3", g: "m", age: 37, trait: "cool, confident, collaborative" },
  { name: "es-419-podcaster-4", g: "m", age: 43, trait: "confident and clear" },
  { name: "es-419-training-10", g: "m", age: 51, trait: "professional yet approachable" },
  { name: "es-419-tutor-2", g: "m", age: 46, trait: "textured, resonant, soothing" },
  { name: "es-419-tutor-4", g: "m", age: 39, trait: "highly approachable" },
  { name: "es-419-tutor-5", g: "m", age: 29, trait: "relaxed" },
];

/** The casting with the catalog's Mexican voices (PC_CASTING=mexico), by gender, age and manner; the same checks. */
const MEXICO: Record<string, string> = {
  coach_f: "es-419-podcaster-2", coach_m: "es-419-podcaster-1", amb_f: "es-419-assistant-1", amb_m: "es-419-commercial-11",
  diaz: "es-419-advisor-6", priya: "es-419-csagent-7", aduana: "es-419-concierge-5", vinnie: "es-419-concierge-8", olivia: "es-419-advisor-7",
  chuck: "es-419-concierge-2", mia: "es-419-assistant-1", rosa: "es-419-tutor-3", ben: "es-419-commercial-1", harold: "es-419-csagent-9",
  marco: "es-419-tutor-5", marcus: "es-419-assistant-6", marco_host: "es-419-commercial-8",
  chloe: "es-419-training-8", okafor: "es-419-training-10", linda: "es-419-concierge-5", jessie: "es-419-advisor-4", aaron: "es-419-podcaster-3",
  gloria: "es-419-assistant-2", claire: "es-419-advisor-7", netwave_bot: "es-419-commercial-9", patel: "es-419-concierge-7", rita: "es-419-assistant-6",
  brooks: "es-419-advisor-4", maria: "es-419-commercial-6", kate: "es-419-advisor-6", paul: "es-419-commercial-12", sara: "es-419-csagent-7",
  harris: "es-419-tutor-2", sophie: "es-419-training-8", mark: "es-419-csagent-4", lizzie: "es-419-training-7", sam: "es-419-tutor-5",
  emma: "es-419-assistant-1", dan: "es-419-tutor-4", nora: "es-419-assistant-2", lucy: "es-419-commercial-8",
  mrs_lee: "es-419-tutor-3", reyes: "es-419-tutor-2", carter: "es-419-assistant-6", sco: "es-419-commercial-9", frank: "es-419-concierge-2",
  jordan: "es-419-commercial-9", walter: "es-419-concierge-7", denise: "es-419-advisor-4", jake: "es-419-commercial-11", dot: "es-419-csagent-8",
  kevin: "es-419-assistant-9", grant: "es-419-podcaster-4", nina: "es-419-commercial-6",
  maggie: "es-419-tutor-3", kyle: "es-419-commercial-1", harbor_bot: "es-419-commercial-9", brenda: "es-419-assistant-6", vanessa: "es-419-advisor-6",
  greg: "es-419-podcaster-4", whitaker: "es-419-csagent-9", russo: "es-419-assistant-1", emily: "es-419-assistant-2", tyler: "es-419-assistant-9",
  mr_grant: "es-419-concierge-8",
};
/** Which casting: Gemini's 30 prebuilt voices ("prebuilt") or the catalog's Mexican voices ("mexico"). */
export type Casting = "prebuilt" | "mexico";
/** Chosen 5 Nov 2026 from the samples (docs/es/VOICES.md "Samples"): the catalog's native Mexican voices. */
const DEFAULT_CASTING: Casting = "mexico";
export const CASTING: Casting = process.env.PC_CASTING === "mexico" || process.env.PC_CASTING === "prebuilt" ? process.env.PC_CASTING : DEFAULT_CASTING;
const voiceIn = (c: Casting, who: string, r: Role) => (c === "mexico" ? MEXICO[who] ?? r.voice : r.voice);

/** The two accents: the voice set es_ speaks Mexican Spanish, esn_ neutral Latin American Spanish. */
export type Accent = "mx" | "neutral";
export const ACCENTS: Record<Accent, string> = {
  mx: "natural Mexican Spanish, as spoken on Mexico's Caribbean coast",
  neutral: "neutral Latin American Spanish (español neutro, as in dubbing), with no regional accent",
};
/** The Mexican direction (the default set). */
export const ACCENT = ACCENTS.mx;

export interface Role {
  /** Gemini's prebuilt voice. */
  voice: string;
  /** About how old they sound. */
  age: string;
  /** Warmth and manner. */
  manner: string;
  /** How fast they speak. */
  pace: string;
}

/** The learner's example answers, by the learner's gender (es_coach_f / es_coach_m): a model to repeat after. */
export const COACH: Record<"f" | "m", Role> = {
  f: { voice: "Erinome", age: "about 30", manner: "clear, friendly and natural, every word distinct", pace: "unhurried" },
  m: { voice: "Iapetus", age: "about 30", manner: "clear, friendly and natural, every word distinct", pace: "unhurried" },
};
/** Passers-by in the town (es_amb_f / es_amb_m). */
export const AMBIENT: Record<"f" | "m", Role> = {
  f: { voice: "Laomedeia", age: "about 35", manner: "friendly and casual, a quick hello in the street", pace: "easy" },
  m: { voice: "Achird", age: "about 40", manner: "friendly and casual, a quick hello in the street", pace: "easy" },
};

/** Every character (npcs.ts): voice, age, manner, pace. Picked by hand for age and manner, then checked for clashes. */
export const CAST: Record<string, Role> = {
  // the arrival: airport, taxi, hotel
  diaz: { voice: "Kore", age: "about 45", manner: "firm, clear and businesslike, strict but fair", pace: "brisk" },
  priya: { voice: "Autonoe", age: "late 20s", manner: "friendly and helpful", pace: "easy" },
  aduana: { voice: "Pulcherrima", age: "about 40", manner: "polite, direct and businesslike", pace: "brisk" },
  vinnie: { voice: "Puck", age: "late 50s", manner: "cheerful and chatty, a taxi driver who knows everyone", pace: "relaxed" },
  olivia: { voice: "Zephyr", age: "late 20s", manner: "warm and welcoming", pace: "easy" },
  // the center
  chuck: { voice: "Sadachbia", age: "about 65", manner: "enthusiastic, proud of his town", pace: "very fast" },
  mia: { voice: "Leda", age: "early 20s", manner: "bright and friendly", pace: "lively" },
  rosa: { voice: "Sulafat", age: "about 70", manner: "relaxed, warm and motherly", pace: "unhurried" },
  ben: { voice: "Achird", age: "mid 20s", manner: "polite and helpful", pace: "easy" },
  harold: { voice: "Schedar", age: "about 65", manner: "dry, with quiet humor", pace: "slow" },
  marco: { voice: "Umbriel", age: "about 30", manner: "friendly and attentive", pace: "easy" },
  marcus: { voice: "Gacrux", age: "about 60", manner: "warm and loud, a market vendor with thirty years at her stall", pace: "lively" },
  marco_host: { voice: "Aoede", age: "late 20s", manner: "welcoming and polite", pace: "easy" },
  // services
  chloe: { voice: "Laomedeia", age: "mid 20s", manner: "upbeat and helpful", pace: "lively" },
  okafor: { voice: "Sadaltager", age: "about 60", manner: "patient, calm and caring", pace: "unhurried" },
  linda: { voice: "Callirrhoe", age: "about 35", manner: "friendly and efficient", pace: "brisk" },
  jessie: { voice: "Pulcherrima", age: "about 40", manner: "chatty and cheerful", pace: "lively" },
  aaron: { voice: "Algieba", age: "about 35", manner: "polite and professional", pace: "even" },
  gloria: { voice: "Achernar", age: "mid 50s", manner: "warm and patient", pace: "unhurried" },
  claire: { voice: "Zephyr", age: "about 30", manner: "polite and helpful", pace: "even" },
  netwave_bot: { voice: "Despina", age: "ageless", manner: "even and polished, an automated phone menu", pace: "measured" },
  patel: { voice: "Charon", age: "about 60", manner: "polite and businesslike", pace: "measured" },
  rita: { voice: "Sulafat", age: "about 65", manner: "friendly, chatty and kind", pace: "easy" },
  // work
  brooks: { voice: "Kore", age: "about 50", manner: "professional and warm", pace: "measured" },
  maria: { voice: "Callirrhoe", age: "late 20s", manner: "friendly and casual", pace: "easy" },
  kate: { voice: "Pulcherrima", age: "late 30s", manner: "confident and friendly", pace: "brisk" },
  paul: { voice: "Zubenelgenubi", age: "early 30s", manner: "upbeat and casual", pace: "easy" },
  sara: { voice: "Autonoe", age: "late 20s", manner: "lively and casual", pace: "lively" },
  harris: { voice: "Orus", age: "mid 50s", manner: "calm and authoritative", pace: "measured" },
  // social
  sophie: { voice: "Zephyr", age: "early 30s", manner: "warm and cheerful", pace: "lively" },
  mark: { voice: "Puck", age: "early 30s", manner: "excited and playful, a chef who loves to talk about food", pace: "fast" },
  lizzie: { voice: "Callirrhoe", age: "late 20s", manner: "warm and casual, a close friend", pace: "easy" },
  sam: { voice: "Enceladus", age: "early 30s", manner: "relaxed, warm and a little shy", pace: "easy" },
  emma: { voice: "Leda", age: "about 30", manner: "bright, warm and a little shy", pace: "easy" },
  dan: { voice: "Umbriel", age: "about 40", manner: "warm and easygoing", pace: "relaxed" },
  nora: { voice: "Aoede", age: "late 30s", manner: "warm and lively", pace: "lively" },
  lucy: { voice: "Laomedeia", age: "early 30s", manner: "excited and cheerful, happy to see an old friend", pace: "fast" },
  // help, health, sport
  mrs_lee: { voice: "Vindemiatrix", age: "about 70", manner: "kind, calm and gentle", pace: "slow" },
  reyes: { voice: "Alnilam", age: "about 45", manner: "calm and professional", pace: "measured" },
  carter: { voice: "Achernar", age: "about 50", manner: "calm, careful and reassuring", pace: "unhurried" },
  sco: { voice: "Despina", age: "ageless", manner: "flat and polite, a self-checkout machine", pace: "measured" },
  frank: { voice: "Algenib", age: "about 75", manner: "chatty and warm", pace: "a little slow" },
  jordan: { voice: "Autonoe", age: "about 30", manner: "energetic and encouraging", pace: "lively" },
  // travel
  walter: { voice: "Rasalgethi", age: "about 60", manner: "polite and helpful", pace: "measured" },
  denise: { voice: "Kore", age: "mid 40s", manner: "matter-of-fact", pace: "brisk" },
  jake: { voice: "Achird", age: "early 30s", manner: "friendly and professional", pace: "easy" },
  dot: { voice: "Sulafat", age: "about 60", manner: "casual and friendly", pace: "easy" },
  kevin: { voice: "Algieba", age: "late 20s", manner: "polite and efficient", pace: "brisk" },
  grant: { voice: "Orus", age: "about 45", manner: "calm and firm", pace: "brisk" },
  nina: { voice: "Aoede", age: "about 30", manner: "polite and clear", pace: "brisk" },
  // the advanced conversations and the living language
  maggie: { voice: "Gacrux", age: "about 65", manner: "warm and theatrical, enjoys a good haggle", pace: "lively" },
  kyle: { voice: "Rasalgethi", age: "about 30", manner: "polite, a little scripted", pace: "even" },
  harbor_bot: { voice: "Despina", age: "ageless", manner: "even and polished, a recorded message", pace: "measured" },
  brenda: { voice: "Vindemiatrix", age: "mid 40s", manner: "calm, understanding and professional", pace: "measured" },
  vanessa: { voice: "Laomedeia", age: "mid 30s", manner: "upbeat and confident", pace: "fast" },
  greg: { voice: "Alnilam", age: "mid 40s", manner: "relaxed and direct", pace: "easy" },
  whitaker: { voice: "Schedar", age: "about 65", manner: "quiet, precise and kind", pace: "unhurried" },
  russo: { voice: "Leda", age: "19", manner: "nervous and eager", pace: "quick" },
  emily: { voice: "Achernar", age: "late 30s", manner: "warm and a little nervous", pace: "easy" },
  tyler: { voice: "Fenrir", age: "early 30s", manner: "excitable, full of startup talk", pace: "fast" },
  mr_grant: { voice: "Zubenelgenubi", age: "about 60", manner: "friendly and very casual", pace: "relaxed" },
};

/** A conversation's setting, for everyone in it or only for some (`who`). `fx`: the sound of a phone line or a
 *  video call, made on the clip after it is recorded (a band-pass; the clean take stays in the work folder). */
export interface Scene { setting: string; who?: string[]; fx?: "phone" | "video" }
const PHONE: Scene = { setting: "speaking on the phone", fx: "phone" };
export const SCENES: Record<string, Scene> = {
  // phone calls (mode "phone")
  "s76-dentist-call": PHONE, "s80-support-call": PHONE, "s83-invite-call": PHONE, "s90-running-late": PHONE,
  "p24-flood": PHONE, "p26-complaint": PHONE,
  // the video call, and Sara on the meeting-room screen from home
  "s89-video-call": { setting: "on a video call from a laptop", fx: "video" },
  "s34-meeting": { setting: "on a video call from home, on the meeting-room screen", who: ["sara"], fx: "video" },
  // the museum guard keeps his voice down; the market vendor calls out; the airport is brisk; the party is lively
  "s70-museum": { setting: "speaking quietly, almost under his breath, in a hushed museum hall", who: ["harold"] },
  "s32-mercado": { setting: "calling out from her stall over the noise of a busy market" },
  "s64a-checkin": { setting: "brisk and efficient at a busy airport counter" },
  "s64b-security": { setting: "brisk and efficient at a busy airport checkpoint" },
  "s64c-gate": { setting: "brisk and efficient at a busy airport gate" },
  "s65a-passport": { setting: "brisk and efficient at a busy passport control desk" },
  "s65b-baggage": { setting: "brisk and efficient at the customs exit", who: ["aduana"] },
  "s63-party": { setting: "at a lively party, a little louder over the music and chatter" },
  // the rest as the scene suggests
  "s66-taxi": { setting: "chatting while driving his taxi" },
  "s67b-bus": { setting: "from the driver's seat of a busy bus" },
  "s84-date": { setting: "relaxed on a date by the sea" },
  "s85-dinner": { setting: "at home at a relaxed dinner with friends" },
  "p30-start-over": { setting: "at home, a relaxed evening with a friend" },
  "s33-small-talk": { setting: "small talk at a bus stop" },
  "s35-gym": { setting: "coaching at the gym" },
  "s87-interview": { setting: "a job interview in an office" },
  "s91b-police": { setting: "at a police station desk" },
};

/** The voice ids (src/editions/es/content/voices.ts) → who they are, and in which accent. */
export function whoOf(voiceId: string): string | null {
  return /^esn?_/.test(voiceId) ? voiceId.replace(/^esn?_/, "") : null;
}
export const accentOf = (voiceId: string): Accent => (voiceId.startsWith("esn_") ? "neutral" : "mx");

/** The role behind a voice id: a character, a coach or a passer-by, with the voice of the casting in use. */
export function roleOf(who: string, casting: Casting = CASTING): Role | null {
  const r = who === "coach_f" || who === "coach_m" ? COACH[who.slice(-1) as "f" | "m"] : who === "amb_f" || who === "amb_m" ? AMBIENT[who.slice(-1) as "f" | "m"] : CAST[who];
  return r ? { ...r, voice: voiceIn(casting, who, r) } : null;
}

/** The scenes that apply to `who` in conversation `sit`. */
export const sceneFor = (who: string, sit: string): Scene | null => {
  const s = SCENES[sit];
  return s && (!s.who || s.who.includes(who)) ? s : null;
};

/** Directions that can be switched for the sample's comparisons (voice-batch-es.ts sample --age / --no-accent). */
export interface StyleOpts { age?: boolean; accent?: Accent | "none" }
export const STYLE_DEFAULT: StyleOpts = { age: false, accent: "mx" };

/** The style sent with a line: manner, pace, the setting of the conversations it is said in (when they all agree),
 *  and the accent. Age is the voice's: Google advises keeping it out of the style (the sample compares both). */
export function styleFor(who: string, sits: string[], o: StyleOpts = STYLE_DEFAULT): { style: string; fx?: "phone" | "video"; scene?: string } {
  const r = roleOf(who);
  if (!r) throw new Error(`no casting for ${who}`);
  // the coaches and the passers-by are never on the phone (the example answers are the learner's own voice)
  const scenes = CAST[who] ? sits.map((s) => sceneFor(who, s)) : [];
  // a line said in two settings (a greeting both in the room and on the video call) gets none
  const one = scenes.length && scenes.every((s) => s && s.setting === scenes[0]!.setting) ? scenes[0] : null;
  const parts = [r.manner, `${r.pace} pace`];
  if (o.age) parts.push(`sounds ${r.age}`);
  if (one) parts.push(one.setting);
  const accent = o.accent ?? "mx";
  if (accent !== "none") parts.push(ACCENTS[accent]);
  return { style: parts.join("; "), ...(one?.fx ? { fx: one.fx } : {}), ...(one ? { scene: one.setting } : {}) };
}

/** The conversations a character is in. */
export const where = (id: string) => SITUATIONS.filter((s) => s.npc === id || (s.npcs || []).includes(id)).map((s) => s.id.split("-")[0]);

const together = new Map<string, Set<string>>();
for (const s of SITUATIONS) {
  const ids = [s.npc, ...(s.npcs || [])].filter((id) => NPCS[id]);
  // customs at the end of the baggage hall (c.speaker("aduana") in s65b)
  if (s.id.startsWith("s65b")) ids.push("aduana");
  if (s.id.startsWith("p26")) ids.push("harbor_bot");
  for (const a of ids) for (const b of ids) if (a !== b) { if (!together.has(a)) together.set(a, new Set()); together.get(a)!.add(b); }
}
export const partners = (id: string) => together.get(id) ?? new Set<string>();

/** Problems with the casting: a character without a role, a voice of the wrong gender, two people in one
 *  conversation with the same voice, a character with a coach's voice. Empty when all is well. */
export function castingProblems(casting: Casting = CASTING): string[] {
  const out: string[] = [];
  const voiceOf = (id: string) => roleOf(id, casting)?.voice;
  const coach = new Set([voiceOf("coach_f"), voiceOf("coach_m")]);
  const list = casting === "mexico" ? MX_VOICES : VOICES;
  for (const n of Object.values(NPCS)) {
    const voice = voiceOf(n.id);
    if (!voice) { out.push(`${n.id} (${n.name}) has no voice`); continue; }
    const v = list.find((x) => x.name === voice);
    if (!v) out.push(`${n.id}: unknown voice ${voice}`);
    else if (v.g !== n.gender && v.g !== "n") out.push(`${n.id} (${n.name}, ${n.gender}) has ${voice} (${v.g})`);
    if (coach.has(voice)) out.push(`${n.id} has a coach's voice (${voice})`);
    for (const p of partners(n.id)) if (voiceOf(p) === voice && n.id < p) out.push(`${n.id} and ${p} meet in one conversation and share ${voice}`);
  }
  for (const id of Object.keys(CAST)) if (!NPCS[id]) out.push(`CAST has ${id}, who isn't in npcs.ts`);
  return out;
}
