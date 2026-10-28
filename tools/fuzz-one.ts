// Debug one changed turn: npx tsx tools/fuzz-one.ts <situation> <sim name prefix> <seed> <original turn> <changed turn>
import { SITUATION_BY_ID } from "../src/content/situations";
import { setKnownNames } from "../src/convo/slots";
import { playSim } from "./sim-play";
setKnownNames(["Tomas", "Mikalauskas"]);
const [id, simName, seedS, orig, changed] = process.argv.slice(2);
const sit = SITUATION_BY_ID[id];
const sim = sit.sims!.find((s) => s.name.startsWith(simName))!;
for (const say of [orig, changed]) {
  const run = playSim(sit, { ...sim, turns: sim.turns.map((t) => (t === orig ? say : t)) }, Number(seedS));
  const t = run.turns.find((x) => !x.auto && x.say === say)!;
  const o: any = t.out;
  console.log(`“${say}” at ${t.waiting}: understood ${o.understood}, intents ${JSON.stringify(o.intents ?? o.matched ?? o.debug ?? null)}`);
  console.log("   reply: " + o.lines.map((l: any) => l.sentence.en).join(" "));
}
