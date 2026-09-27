// Print every simulated conversation of a situation (English, the Lithuanian sentence and the
// interlinear units), for proofreading:
//   npx tsx tools/review.ts <situation id | file.ts> [--units] [--seed=N]
import { SITUATION_BY_ID } from "../src/content/situations";
import { pathToFileURL } from "node:url";
import path from "node:path";
import type { SituationDef } from "../src/content/types";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation, type TurnOut } from "../src/convo/dialogue";

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
// same turn-taking as tools/check-content.ts: answer the NPC's open question from `auto`
// unless the next scripted turn already answers it
for (const sim of sit.sims ?? []) {
  const s0 = sim.seed ?? seed;
  console.log(`\n=== ${sit.id} · ${sim.name} (seed ${s0}) ===`);
  const conv = new Conversation(sit, {
    global: GLOBAL, npcs: NPCS, player: { name: "Tomas", surname: "Mikalauskas", gender: (process.env.GENDER as any) || "m", datePartner: "emma" },
    visits: Number(process.env.VISITS ?? s0 % 3), seed: s0, memory: {},
  });
  const defaults: Record<string, string> = { howareyou: "Good, thanks. And you?", closing: "Thank you, bye!", ...(sim.auto ?? {}) };
  show(conv.start());
  const turns = sim.turns;
  let i = 0;
  const usedAuto = new Set<string>();
  for (let guard = 0; guard < 30 && !conv.ended; guard++) {
    const waiting = conv.pending?.id ?? conv.step ?? "";
    const key = waiting + ":" + conv.history.length;
    let t: string | undefined;
    if (defaults[waiting] && !usedAuto.has(key) && !(i < turns.length && conv.nlu.parse(turns[i], conv.expectedIntents()).best?.segments.some((x) => conv.expectedIntents().includes(x.intent)))) { t = defaults[waiting]; usedAuto.add(key); }
    else if (i < turns.length) t = turns[i++];
    else if (defaults[waiting]) t = defaults[waiting];
    else break;
    const o = conv.input(t);
    console.log(`> ${t}${o.understood ? "" : "   [not understood]"}`);
    show(o);
    if (conv.completed && i >= turns.length && !conv.pending) break;
  }
  console.log(conv.completed ? "  ✓ completed" : "  … not completed");
}
