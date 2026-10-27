// Casting for the Gemini voices (docs/VOICING-PLAN.md): every character gets a prebuilt Gemini voice of the right
// gender, no two people in one conversation share a voice, and the voices are spread so characters met close
// together sound different. The two coach voices (the learner's example answers) belong to no character.
// Each role also gets a short `style`: how they speak, sent to Gemini as speech_metadata.style. Google advises
// keeping age, gender and accent out of it (the voice carries those), so it only describes the manner.
// The owner hears a casting sample before anything else is recorded (tools/voice-batch.ts prepare --sample).
// The table: npx tsx tools/voice-casting.ts
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

/** Hand-picked voices where the character calls for it (age, manner); the rest is drawn from the role. */
const PICKS: Record<string, { voice: string; note: string }> = {
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

/** How each character speaks (manner only). */
const STYLE: Record<string, string> = {
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
  const style = (id: string) => STYLE[id] ?? "friendly and natural";
  // hand picks first, then everyone else: the least used voice of the right gender that no partner has
  for (const n of people) if (PICKS[n.id]) { CAST[n.id] = { voice: PICKS[n.id].voice, style: style(n.id), note: PICKS[n.id].note }; take(PICKS[n.id].voice); }
  for (const n of people) {
    if (CAST[n.id]) continue;
    const busy = new Set([...partners(n.id)].map((p) => CAST[p]?.voice).filter(Boolean));
    const pool = VOICES.filter((v) => v.g === n.gender && !busy.has(v.name) && !coachOnly.has(v.name)).sort((a, b) => (uses.get(a.name) ?? 0) - (uses.get(b.name) ?? 0));
    const v = pool[0] ?? VOICES.find((x) => x.g === n.gender && !coachOnly.has(x.name))!;
    take(v.name);
    CAST[n.id] = { voice: v.name, style: style(n.id), note: `${n.role.en.toLowerCase()}: ${v.trait}` };
  }
}

/** The Gemini voice and style for a voice id of src/content/voices.ts (g_<npcId>, g_coach_f, g_amb_m, …). */
export function roleFor(voiceId: string): (Role & { who: string }) | null {
  if (!voiceId.startsWith("g_")) return null;
  const id = voiceId.slice(2);
  if (id === "coach_f" || id === "coach_m") return { ...COACH[id.slice(-1) as "f" | "m"], who: id };
  if (id === "amb_f" || id === "amb_m") return { ...AMBIENT[id.slice(-1) as "f" | "m"], who: id };
  return CAST[id] ? { ...CAST[id], who: id } : null;
}

/** Characters whose voice is also used by someone they share a conversation with (should be none). */
export const clashes = () => people.filter((n) => [...partners(n.id)].some((p) => CAST[p]?.voice === CAST[n.id].voice)).map((n) => n.id);
