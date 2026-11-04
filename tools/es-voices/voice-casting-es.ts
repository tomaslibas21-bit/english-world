// The casting of Puerto Colibrí's Gemini voices (tools/es-voices/casting-es.ts) as tables for docs/es/VOICES.md.
//   EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/voice-casting-es.ts          Markdown
//   EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/voice-casting-es.ts --json   { cast, coach, ambient, scenes }
import { NPCS } from "../../src/content/npcs";
import { ACCENTS, AMBIENT, CAST, CASTING, COACH, SCENES, castingProblems, roleOf, where } from "./casting-es";

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ cast: CAST, coach: COACH, ambient: AMBIENT, scenes: SCENES, accents: ACCENTS }, null, 2));
} else {
  const row = (name: string, role: string, convs: string, r: { voice: string; age: string; manner: string; pace: string }) =>
    `| ${name} | ${role} | ${convs || "—"} | ${r.voice} | ${r.age} | ${r.manner} | ${r.pace} |`;
  console.log("| Character | Role | Conversations | Gemini voice | Age | Manner | Pace |\n|---|---|---|---|---|---|---|");
  for (const n of Object.values(NPCS)) console.log(row(`${n.name} (${n.gender}, \`${n.id}\`)`, `${n.role.en} (${n.role.lt})`, where(n.id).join(", ") || (n.id === "aduana" ? "s65b" : ""), roleOf(n.id)!));
  console.log(row("Coach (female learner)", "example answers", "all", roleOf("coach_f")!));
  console.log(row("Coach (male learner)", "example answers", "all", roleOf("coach_m")!));
  console.log(row("Passer-by (f)", "the town", "", roleOf("amb_f")!));
  console.log(row("Passer-by (m)", "the town", "", roleOf("amb_m")!));
  console.log("\n| Conversation | Who | Setting | Sound |\n|---|---|---|---|");
  for (const [sit, s] of Object.entries(SCENES)) console.log(`| ${sit} | ${s.who?.map((w) => NPCS[w]?.name ?? w).join(", ") ?? "everyone"} | ${s.setting} | ${s.fx === "phone" ? "phone line" : s.fx === "video" ? "video call" : "—"} |`);
  const p = castingProblems();
  const voices = new Set(Object.keys(CAST).map((id) => roleOf(id)!.voice));
  console.log(`\n${Object.keys(NPCS).length} characters on ${voices.size} voices (the ${CASTING} casting), each in two accents: “${ACCENTS.mx}” (es_…) and “${ACCENTS.neutral}” (esn_…). ${p.length ? "Problems: " + p.join("; ") : "No clashes: nobody shares a voice with someone in the same conversation, and the coach voices belong to no character."}`);
}
