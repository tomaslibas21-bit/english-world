// The casting of the Gemini voices (tools/casting.ts) as a table for docs/VOICING-PLAN.md.
//   npx tsx tools/voice-casting.ts            → a Markdown table on stdout
//   npx tsx tools/voice-casting.ts --json     → { cast, coach, ambient }
import { NPCS } from "../src/content/npcs";
import { AMBIENT, CAST, clashes, COACH, where } from "./casting";

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ cast: CAST, coach: COACH, ambient: AMBIENT }, null, 2));
} else {
  console.log("| Character | Role | Conversations | Gemini voice | Style (how they speak) |\n|---|---|---|---|---|");
  for (const n of Object.values(NPCS)) console.log(`| ${n.name} (${n.gender}) | ${n.role.en} | ${where(n.id).join(", ") || "—"} | ${CAST[n.id].voice} | ${CAST[n.id].style} |`);
  console.log(`| Coach (female learner) | example answers | all | ${COACH.f.voice} | ${COACH.f.style} |`);
  console.log(`| Coach (male learner) | example answers | all | ${COACH.m.voice} | ${COACH.m.style} |`);
  console.log(`| Passer-by (f) | the town | — | ${AMBIENT.f.voice} | ${AMBIENT.f.style} |`);
  console.log(`| Passer-by (m) | the town | — | ${AMBIENT.m.voice} | ${AMBIENT.m.style} |`);
  const c = clashes();
  console.log(`\n${Object.keys(NPCS).length} characters; voices shared within a conversation: ${c.length ? c.join(", ") : "none"}; the coach voices belong to no character`);
}
