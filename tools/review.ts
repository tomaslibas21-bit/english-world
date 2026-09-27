// Print every simulated conversation of a situation (English, the Lithuanian sentence and the
// interlinear units), for proofreading:
//   npx tsx tools/review.ts <situation id | file.ts> [--units] [--seed=N]
import { SITUATION_BY_ID } from "../src/content/situations";
import { pathToFileURL } from "node:url";
import path from "node:path";
import type { SituationDef } from "../src/content/types";
import { NPCS } from "../src/content/npcs";
import type { TurnOut } from "../src/convo/dialogue";
import { playSim } from "./sim-play";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"))!;
const units = args.includes("--units");
const seed = Number(args.find((a) => a.startsWith("--seed="))?.slice(7) ?? 1);
let sit: SituationDef | undefined = SITUATION_BY_ID[id];
if (!sit && id.endsWith(".ts")) sit = (await import(pathToFileURL(path.resolve(id)).href)).default;
if (!sit) { console.error("Unknown situation " + id); process.exit(1); }

const show = (o: TurnOut) => {
  for (const l of o.lines) {
    console.log(`  ${NPCS[l.npc]?.name ?? l.npc}: ${l.sentence.en}\n      ${l.sentence.nat}`);
    if (units) console.log(`      ${l.sentence.units.map((u) => `${u.en}=${u.lt}`).join(" · ")}`);
  }
  if (o.tips.length) console.log("  💡 " + o.tips.map((t) => t.lt).join(" / "));
};
// the same turn-taking as check-content (tools/sim-play.ts); "(auto)" marks an auto answer
for (const sim of sit.sims ?? []) {
  const s0 = sim.seed ?? seed;
  console.log(`\n=== ${sit.id} · ${sim.name} (seed ${s0}) ===`);
  const { conv } = playSim(sit, sim, s0, {
    gender: (process.env.GENDER as "m" | "f") || "m", visits: Number(process.env.VISITS ?? s0 % 3), datePartner: "emma",
    onTurn: (_conv, t, o) => {
      if (t) console.log(`> ${t.say}${t.auto ? "   (auto)" : ""}${o.understood ? "" : "   [not understood]"}`);
      show(o);
    },
  });
  console.log(conv.completed ? "  ✓ completed" : "  … not completed");
}
