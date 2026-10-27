// Draft casting for the planned re-voicing with Gemini TTS (docs/VOICING-PLAN.md): every character gets a prebuilt
// Gemini voice of the right gender, no two people in one conversation share a voice, and the voices are spread so
// characters met close together sound different. The owner hears a casting sample before anything is recorded.
//   npx tsx tools/voice-casting.ts            → a Markdown table on stdout
//   npx tsx tools/voice-casting.ts --json     → { npcId: { voice, note } }
import { NPCS } from "../src/content/npcs";
import { SITUATIONS } from "../src/content/situations";

/** Gemini's prebuilt voices with Google's one-word descriptions; the gender is how they usually sound. */
const VOICES: { name: string; g: "f" | "m"; trait: string }[] = [
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

/** Hand-picked voices and notes where the character calls for it (age, manner); the rest is drawn from the role. */
const PICKS: Record<string, { voice?: string; note: string }> = {
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
  carter: { voice: "Erinome", note: "a family doctor: calm, careful, reassuring" },
  netwave_bot: { voice: "Despina", note: "an automated phone menu: even, polished, slightly robotic" },
  harbor_bot: { voice: "Despina", note: "a recorded phone message: even, polished" },
  sco: { voice: "Despina", note: "a self-checkout machine: flat, polite, robotic" },
};

const people = Object.values(NPCS) as any[];
const together = new Map<string, Set<string>>();
for (const s of SITUATIONS) {
  const ids = [s.npc, ...(s.npcs || [])].filter((id) => NPCS[id]);
  for (const a of ids) for (const b of ids) if (a !== b) { if (!together.has(a)) together.set(a, new Set()); together.get(a)!.add(b); }
}
const where = (id: string) => SITUATIONS.filter((s) => s.npc === id || (s.npcs || []).includes(id)).map((s) => s.id.split("-")[0]);

const cast: Record<string, { voice: string; note: string }> = {};
const uses = new Map<string, number>();
const take = (v: string) => uses.set(v, (uses.get(v) ?? 0) + 1);
// hand picks first, then everyone else: the least used voice of the right gender that no partner has
for (const n of people) if (PICKS[n.id]?.voice) { cast[n.id] = { voice: PICKS[n.id].voice!, note: PICKS[n.id].note }; take(PICKS[n.id].voice!); }
for (const n of people) {
  if (cast[n.id]) continue;
  const busy = new Set([...(together.get(n.id) ?? [])].map((p) => cast[p]?.voice).filter(Boolean));
  const pool = VOICES.filter((v) => v.g === n.gender && !busy.has(v.name)).sort((a, b) => (uses.get(a.name) ?? 0) - (uses.get(b.name) ?? 0));
  const v = pool[0] ?? VOICES.find((x) => x.g === n.gender)!;
  take(v.name);
  cast[n.id] = { voice: v.name, note: PICKS[n.id]?.note ?? `${n.role.en.toLowerCase()}: ${v.trait}, natural American English` };
}
// the learner's two coach voices (example answers), by the learner's gender
const COACH = { f: { voice: "Erinome", note: "a clear, friendly model voice for a learner to repeat after: unhurried" },
  m: { voice: "Iapetus", note: "a clear, friendly model voice for a learner to repeat after: unhurried" } };

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ cast, coach: COACH }, null, 2));
} else {
  console.log("| Character | Role | Conversations | Gemini voice | Style note |\n|---|---|---|---|---|");
  for (const n of people) console.log(`| ${n.name} (${n.gender}) | ${n.role.en} | ${where(n.id).join(", ") || "—"} | ${cast[n.id].voice} | ${cast[n.id].note} |`);
  console.log(`| Coach (female learner) | example answers | all | ${COACH.f.voice} | ${COACH.f.note} |`);
  console.log(`| Coach (male learner) | example answers | all | ${COACH.m.voice} | ${COACH.m.note} |`);
  const clash = people.filter((n) => [...(together.get(n.id) ?? [])].some((p) => cast[p]?.voice === cast[n.id].voice));
  console.log(`\n${people.length} characters; voices shared within a conversation: ${clash.length ? clash.map((n) => n.id).join(", ") : "none"}`);
}
