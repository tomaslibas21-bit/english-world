// Print a simulated conversation with interlinear units:
//   npx tsx tools/sim.ts <situationId> <seed> "turn 1" "turn 2" ...
import { SITUATION_BY_ID } from "../src/content/situations";
import { pathToFileURL } from "node:url";
import path from "node:path";
import type { SituationDef } from "../src/content/types";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation, type TurnOut } from "../src/convo/dialogue";

const [id, seedS, ...turns] = process.argv.slice(2);
// id may be a situation id or a path to a situation file
let sit: SituationDef | undefined = SITUATION_BY_ID[id];
if (!sit && id.endsWith(".ts")) { const mod = await import(pathToFileURL(path.resolve(id)).href); sit = mod.default; }
if (!sit) { console.error("Unknown situation " + id); process.exit(1); }
const conv = new Conversation(sit, {
  global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "Mikalauskas", gender: (process.env.GENDER as any) || "m" },
  visits: Number(process.env.VISITS || 0), seed: Number(seedS), memory: {},
});
const show = (o: TurnOut) => {
  for (const l of o.lines) {
    console.log(`  ${NPCS[l.npc]?.name ?? l.npc}: ${l.sentence.en}${l.slow ? "  (slowly)" : ""}`);
    console.log(`      LT: ${l.sentence.nat}`);
    console.log(`      ${l.sentence.units.map((u) => `${u.en}=${u.lt}`).join(" · ")}`);
  }
  if (o.tips.length) console.log("  💡 " + o.tips.map((t) => t.lt).join(" / "));
  if (o.hintsUsed.length) console.log("  ✓ expressions: " + o.hintsUsed.join(", "));
  if (o.note) console.log("  📝 " + o.note.en);
};
show(conv.start());
for (const t of turns) {
  const o = conv.input(t);
  console.log(`> ${t}${o.understood ? "" : `   [not understood${o.prefix ? ", unfinished" : ""}]`}   {waiting: ${conv.pending?.id ?? conv.step}}`);
  show(o);
  if (o.ended) { console.log("  [conversation ended]"); break; }
}
console.log(conv.completed ? "✓ completed" : "… not completed");
