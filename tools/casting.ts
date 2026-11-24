// Casting for the Gemini voices (docs/VOICING-PLAN.md): every character gets a prebuilt Gemini voice of the right
// gender, no two people in one conversation share a voice, and the voices are spread so characters met close
// together sound different. The two coach voices (the learner's example answers) belong to no character.
// Each role also gets a short `style`: how they speak, sent to Gemini as speech_metadata.style. Google advises
// keeping age, gender and accent out of it (the voice carries those), so it only describes the manner.
// The owner hears a casting sample before anything else is recorded (tools/voice-batch.ts prepare --sample).
// The table: npx tsx tools/voice-casting.ts
import { ASK_WAY_NPC } from "../src/content/ask-way-lines";
import { PHOTO_WALK_NPC } from "../src/content/photo-walk-lines";
import { NPCS } from "../src/content/npcs";
import { SITUATIONS } from "../src/content/situations";

export interface Role { voice: string; style: string; note: string }

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

/** The learner's example answers, by the learner's gender (voice ids g_coach_f / g_coach_m). */
export const COACH: Record<"f" | "m", Role> = {
  f: { voice: "Erinome", style: "clear, friendly and unhurried", note: "a model voice for a learner to repeat after" },
  m: { voice: "Iapetus", style: "clear, friendly and unhurried", note: "a model voice for a learner to repeat after" },
};
/** Passers-by in the town (g_amb_f / g_amb_m). */
export const AMBIENT: Record<"f" | "m", Role> = {
  f: { voice: "Laomedeia", style: "friendly and casual", note: "a passer-by" },
  m: { voice: "Achird", style: "friendly and casual", note: "a passer-by" },
};

/** The convertibles' owners (g_ride_<id>: src/content/rides.ts RIDE_OWNERS) and the passers-by who call after a car
 *  that went by too close (g_shout_f0 … g_shout_m1: two voices a gender, a younger and an older one). They are in no
 *  conversation, so they may share a voice with anyone. */
export const RIDERS: Record<string, Role> = {
  ride_park: { voice: "Aoede", style: "sunny and carefree, calling over from her convertible at the curb", note: "Jess, about 27: happy to lend her car" },
  ride_east: { voice: "Umbriel", style: "laid-back and good-humored, in no hurry at all, calling over from his convertible at the curb", note: "Walt, about 60: all the time in the world" },
  ride_west1: { voice: "Pulcherrima", style: "dry and teasing, playfully strict about her car", note: "Carol, about 45: it is a classic, and she wants it back" },
  ride_west2: { voice: "Puck", style: "eager and enthusiastic, proud of the car and glad to share it", note: "Pete, about 30: loves the car more than anyone" },
  shout_f0: { voice: "Laomedeia", style: "calling out loudly after a car that passed too close: startled, a little indignant, never angry", note: "a passer-by, younger" },
  shout_f1: { voice: "Gacrux", style: "calling out loudly after a car that passed too close: startled, a little indignant, never angry", note: "a passer-by, older" },
  shout_m0: { voice: "Achird", style: "calling out loudly after a car that passed too close: startled, a little indignant, never angry", note: "a passer-by, younger" },
  shout_m1: { voice: "Algenib", style: "calling out loudly after a car that passed too close: startled, a little indignant, never angry", note: "a passer-by, older" },
};

/** Street moments (g_st_<id>: src/content/street.ts). The regulars have separate voices. */
export const STREET: Record<string, Role> = {
  st_eli: { voice: "Umbriel", style: "easygoing and playful, with an unhurried rhythm", note: "Eli, a young man who plays guitar on the street" },
  st_sal: { voice: "Alnilam", style: "hearty and direct, with an old-school sales patter", note: "Sal, an older man who sells pretzels and cider from a cart" },
  st_jess: { voice: "Sulafat", style: "bright and easygoing, with a smile in the voice", note: "Jess, a young woman who walks dogs" },
  st_martha: { voice: "Achernar", style: "gentle and thoughtful, with easy pauses", note: "Martha, an older woman who paints by the water" },
  st_leo: { voice: "Sadachbia", style: "light and high-pitched, with quick bursts of excitement", note: "Leo, a seven-year-old boy learning to fly a kite" },
  st_dana: { voice: "Pulcherrima", style: "brisk, upbeat and encouraging", note: "Dana, an adult woman out jogging" },
  st_ray: { voice: "Rasalgethi", style: "warm and neighborly, with clear, steady delivery", note: "Ray, an adult man delivering the mail" },
  st_gus: { voice: "Algieba", style: "quiet and unhurried, with dry humor", note: "Gus, an older man who fishes by the harbor" },
  st_ruth: { voice: "Aoede", style: "warm and reassuring, with a soft, steady rhythm", note: "Ruth, an older woman who feeds pigeons" },
  st_tyler: { voice: "Zubenelgenubi", style: "casual and laid-back, with a hint of a grin", note: "Tyler, a teenage boy practicing skateboard tricks" },

  st_m_adult: { voice: "Achird", style: "friendly, clear and matter-of-fact", note: "An adult man passing by, traveling, driving, or interviewing people" },
  st_f_adult: { voice: "Despina", style: "friendly and conversational, with an even pace", note: "An adult woman passing by, shopping, cycling, or looking for her dog" },
  st_f_old: { voice: "Callirrhoe", style: "friendly and calm, with clear phrasing", note: "An older woman passing by or helping at the library" },
  st_f_young: { voice: "Laomedeia", style: "friendly and relaxed, with natural phrasing", note: "A young woman passing by, visiting town, or studying" },
  st_m_old: { voice: "Algieba", style: "friendly and steady, with an unhurried pace", note: "An older man visiting town, shopping, or looking for his dog" },
  st_m_young: { voice: "Sadaltager", style: "friendly and relaxed, with an even pace", note: "A young man shopping or cycling" },
  st_kid_f: { voice: "Leda", style: "friendly and earnest, with a light, high pitch", note: "A girl looking for her dog" },
  st_kid_m: { voice: "Fenrir", style: "friendly and direct, with a light, high pitch", note: "A boy trying to fix his bike" },
};

/** Hand-picked voices where the character calls for it (age, manner); the rest is drawn from the role. */
const PICKS: Record<string, { voice: string; note: string }> = {
  tina: { voice: "Sulafat", note: "pool hall owner in her early fifties, warm and slightly husky" },
  maggie: { voice: "Gacrux", note: "about 60, a retired drama teacher: warm, theatrical, enjoys a good haggle" },
  frank: { voice: "Algenib", note: "a retired neighbor: chatty, warm, a little slow" },
  mrs_lee: { voice: "Vindemiatrix", note: "an older flower seller: kind, calm, motherly" },
  harold: { voice: "Schedar", note: "an older museum guard: slow, dry humor" },
  whitaker: { voice: "Charon", note: "a head chef in his sixties: quiet, precise, kind" },
  russo: { voice: "Leda", note: "19, her first week in a kitchen: nervous, eager" },
  tyler: { voice: "Fenrir", note: "a startup founder: fast, excitable, full of business idioms" },
  emily: { voice: "Achernar", note: "a new manager in her late 30s: warm, a little nervous" },
  mr_grant: { voice: "Zubenelgenubi", note: "a landlord about 60: friendly, very casual on the phone" },
  chuck: { voice: "Sadachbia", note: "a visitor center volunteer who talks very fast" },
  diaz: { voice: "Kore", note: "a passport officer: strict but fair, firm and clear" },
  carter: { voice: "Achernar", note: "a family doctor: calm, careful, reassuring" },
  netwave_bot: { voice: "Despina", note: "an automated phone menu: even, polished, slightly robotic" },
  harbor_bot: { voice: "Despina", note: "a recorded phone message: even, polished" },
  sco: { voice: "Despina", note: "a self-checkout machine: flat, polite, robotic" },
};

const QUEST_PICKS: Record<string, Role> = {
  [PHOTO_WALK_NPC]: { voice: "Zephyr", style: "bright and conversational", note: "a young traveler making a photo book" },
  [ASK_WAY_NPC]: { voice: "Schedar", style: "warm and unhurried", note: "a longtime resident, about seventy" },
};

/** How each character speaks (manner only). */
const STYLE: Record<string, string> = {
  tina: "warm and teasing",
  diaz: "firm, clear and businesslike", priya: "friendly and helpful", vinnie: "cheerful and chatty", olivia: "warm and welcoming",
  chuck: "very fast and enthusiastic", mia: "bright and friendly", rosa: "relaxed and friendly", ben: "polite and helpful",
  harold: "slow and dry, with quiet humor", marco: "friendly and attentive", chloe: "upbeat and helpful", okafor: "patient, calm and caring",
  jessie: "chatty and cheerful", aaron: "polite and professional", gloria: "warm and patient", marco_host: "welcoming and polite",
  walter: "polite and helpful", denise: "brisk and matter-of-fact", jake: "friendly and professional", dot: "casual and friendly",
  kevin: "polite and efficient", grant: "calm and firm", nina: "polite and clear", linda: "friendly and efficient",
  claire: "polite and helpful", netwave_bot: "even and polished, like an automated phone menu", patel: "polite and businesslike",
  rita: "friendly and chatty", brooks: "professional and warm", maria: "friendly and casual", kate: "confident and friendly",
  paul: "upbeat and casual", sara: "lively and casual", harris: "calm and authoritative", sophie: "warm and cheerful",
  mark: "excited and playful", lizzie: "warm and casual", sam: "relaxed and friendly", emma: "bright and friendly",
  dan: "warm and easygoing", nora: "warm and lively", lucy: "excited and cheerful", mrs_lee: "kind, calm and gentle",
  reyes: "calm and professional", carter: "calm, careful and reassuring", marcus: "friendly and easygoing",
  sco: "flat and polite, like a machine", frank: "chatty and warm, a little slow", jordan: "energetic and encouraging",
  maggie: "warm and theatrical", kyle: "polite, a little scripted", harbor_bot: "even and polished, like a recorded message",
  brenda: "calm, understanding and professional", vanessa: "upbeat and confident", greg: "relaxed and direct",
  whitaker: "quiet, precise and kind", russo: "nervous and eager", emily: "warm and a little nervous", tyler: "fast and excitable",
  mr_grant: "friendly and very casual",
};

const people = Object.values(NPCS);
const together = new Map<string, Set<string>>();
for (const s of SITUATIONS) {
  const ids = [s.npc, ...(s.npcs || [])].filter((id) => NPCS[id]);
  for (const a of ids) for (const b of ids) if (a !== b) { if (!together.has(a)) together.set(a, new Set()); together.get(a)!.add(b); }
}
/** The conversations a character is in. */
export const where = (id: string) => SITUATIONS.filter((s) => s.npc === id || (s.npcs || []).includes(id)).map((s) => s.id.split("-")[0]);
/** Characters who appear together in some conversation. */
export const partners = (id: string) => together.get(id) ?? new Set<string>();

export const CAST: Record<string, Role> = {};
{
  const uses = new Map<string, number>();
  const take = (v: string) => uses.set(v, (uses.get(v) ?? 0) + 1);
  const coachOnly = new Set([COACH.f.voice, COACH.m.voice]);
  const existing = people.filter((n) => !QUEST_PICKS[n.id]);
  const style = (id: string) => STYLE[id] ?? "friendly and natural";
  const pick = (n: typeof people[number], reserved: Set<string>) => {
    const busy = new Set([...partners(n.id)].map((p) => CAST[p]?.voice).filter(Boolean));
    const pool = VOICES.filter((v) => v.g === n.gender && !reserved.has(v.name))
      .sort((a, b) => (uses.get(a.name) ?? 0) - (uses.get(b.name) ?? 0));
    return pool.find((v) => !busy.has(v.name)) ?? pool[0];
  };
  // Restore the established casting first, then move just the people whose voices the quests reserve.
  for (const n of existing) if (PICKS[n.id]) { CAST[n.id] = { voice: PICKS[n.id].voice, style: style(n.id), note: PICKS[n.id].note }; take(PICKS[n.id].voice); }
  for (const n of existing) {
    if (CAST[n.id]) continue;
    const v = pick(n, coachOnly);
    take(v.name);
    CAST[n.id] = { voice: v.name, style: style(n.id), note: `${n.role.en.toLowerCase()}: ${v.trait}` };
  }
  const questVoices = new Set(Object.values(QUEST_PICKS).map((role) => role.voice));
  const reserved = new Set([...coachOnly, ...questVoices]);
  for (const n of existing) {
    const role = CAST[n.id];
    if (!questVoices.has(role.voice)) continue;
    const v = pick(n, reserved);
    take(v.name);
    CAST[n.id] = { ...role, voice: v.name, note: PICKS[n.id]?.note ?? `${n.role.en.toLowerCase()}: ${v.trait}` };
  }
  for (const n of people) if (QUEST_PICKS[n.id]) CAST[n.id] = QUEST_PICKS[n.id];
}

/** The Gemini voice and style for a voice id of src/content/voices.ts (g_<npcId>, g_coach_f, g_amb_m, …). */
export function roleFor(voiceId: string): (Role & { who: string }) | null {
  if (!voiceId.startsWith("g_")) return null;
  const id = voiceId.slice(2);
  if (id === "coach_f" || id === "coach_m") return { ...COACH[id.slice(-1) as "f" | "m"], who: id };
  if (id === "amb_f" || id === "amb_m") return { ...AMBIENT[id.slice(-1) as "f" | "m"], who: id };
  if (RIDERS[id]) return { ...RIDERS[id], who: id };
  if (STREET[id]) return { ...STREET[id], who: id };
  return CAST[id] ? { ...CAST[id], who: id } : null;
}

/** Characters whose voice is also used by someone they share a conversation with (should be none). */
export const clashes = () => people.filter((n) => [...partners(n.id)].some((p) => CAST[p]?.voice === CAST[n.id].voice)).map((n) => n.id);
