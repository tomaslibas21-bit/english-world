// Play exact turns through a situation and print, for each turn, where the conversation stood (step or
// pending question), how the turn was parsed and what the character said; then the recorded state. For
// checking what a "no", a correction or a question really books, pays or records:
//   npx tsx tools/probe.ts <situation id> <scenarios.json> [--keys=a,b,c] [--gender=f]
//   (Spanish: EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/probe.ts …)
// scenarios.json: [{ "name": "…", "turns": ["…", "…"], "setup": { state set after init }, "visits": 1, "seed": 3 }]
// SAY=1 also prints a line's spoken form where it differs from the text.
import { readFileSync } from "node:fs";
import { SITUATION_BY_ID } from "../src/content/situations";
import type { SituationDef } from "../src/content/types";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { Conversation, type TurnOut } from "../src/convo/dialogue";
import { EDITION } from "../src/edition";

const args = process.argv.slice(2);
const [id, file] = args.filter((a) => !a.startsWith("--"));
const opt = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const keys = opt("keys")?.split(",");
const sit = SITUATION_BY_ID[id];
if (!sit || !file) { console.error("Usage: probe.ts <situation id> <scenarios.json> [--keys=a,b] [--gender=f]"); process.exit(1); }

type Scenario = { name: string; turns: string[]; setup?: Record<string, unknown>; visits?: number; seed?: number };
const scenarios: Scenario[] = JSON.parse(readFileSync(file, "utf8"));
const show = (o: TurnOut) => {
  for (const l of o.lines) {
    console.log(`    ${NPCS[l.npc]?.name ?? l.npc}: ${l.sentence.en}`);
    if (process.env.SAY && l.sentence.say && l.sentence.say !== l.sentence.en) console.log(`      say: ${l.sentence.say}`);
  }
};
const named = (slots: Record<string, unknown> = {}) => {
  const s = Object.entries(slots).filter(([k]) => !k.startsWith("__"));
  return s.length ? JSON.stringify(Object.fromEntries(s)) : "";
};

for (const sc of scenarios) {
  const def: SituationDef = sc.setup ? { ...sit, init: (c) => { sit.init?.(c); Object.assign(c.s, sc.setup); } } : sit;
  const seed = sc.seed ?? 3;
  const conv = new Conversation(def, {
    global: GLOBAL, npcs: NPCS, memory: {}, seed, visits: sc.visits ?? 1,
    player: { name: EDITION.simPlayer.name, surname: EDITION.simPlayer.surname, gender: opt("gender") === "f" ? "f" : "m", datePartner: "emma" },
  });
  console.log(`\n=== ${sc.name}`);
  show(conv.start());
  for (const t of sc.turns) {
    const c = conv as any;
    const where = c.pending?.id ? `pending:${c.pending.id}` : `step:${c.step}`;
    const o = conv.input(t);
    const p = (o as any).parse;
    const got = p ? [...p.segments.map((s: any) => s.intent + named(s.slots)), ...(p.yn ? [`yn:${p.yn}`] : [])].join(" + ") : "NOT UNDERSTOOD";
    console.log(`  > ${t}   [${where}] => ${got}`);
    show(o);
  }
  const c = conv as any;
  const state = Object.entries(c.s ?? {}).filter(([k, v]) => v !== undefined && (!keys || keys.includes(k)));
  console.log(`  STATE ${state.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(" ")}`);
  console.log(`  step=${c.step} pending=${c.pending?.id ?? "-"} completed=${c.completed} ended=${c.ended}`);
}
