// Replays situations' scripted sims with each learner turn changed the way real learners and speech recognition
// change it, and lists the turns that stop being understood (or derail the conversation):
//   asr        lower case, no punctuation (what the speech recognizer often gives)
//   noplease   without "please"
//   noarticle  without a / an / the (Lithuanian has no articles)
//   want       "I'd like (to)" / "I would like (to)" → "I want (to)"; "Could I" → "Can I"
//   filler     "Um, " in front
//   nogreet    without a greeting or "excuse me / sorry / well / oh" in front
// Usage: npx tsx tools/fuzz-sims.ts [situation-prefix ...] [--seeds=1,2]
import { SITUATIONS } from "../src/content/situations";
import { setKnownNames } from "../src/convo/slots";
import { playSim } from "./sim-play";

setKnownNames(["Tomas", "Mikalauskas"]);

const VARIANTS: Record<string, (t: string) => string> = {
  asr: (t) => t.toLowerCase().replace(/[.,!?;:"“”]/g, "").replace(/\s+/g, " ").trim(),
  noplease: (t) => t.replace(/,?\s*\bplease\b,?/gi, "").replace(/\s+([.?!])/g, "$1").trim(),
  noarticle: (t) => t.replace(/\b(a|an|the)\s+/gi, "").trim(),
  want: (t) => t.replace(/\bI'd like\b/gi, "I want").replace(/\bI would like\b/gi, "I want").replace(/\bCould I\b/g, "Can I"),
  filler: (t) => "Um, " + t.charAt(0).toLowerCase() + t.slice(1),
  nogreet: (t) => t.replace(/^(hi|hello|hey|good (morning|afternoon|evening)|excuse me|sorry|well|oh|okay|ok)\b[,!.]?\s*/i, "").replace(/^./, (c) => c.toUpperCase()),
};

const args = process.argv.slice(2);
const prefixes = args.filter((a) => !a.startsWith("--"));
const seeds = (args.find((a) => a.startsWith("--seeds="))?.slice(8) ?? "1,2").split(",").map(Number);
const sits = SITUATIONS.filter((s) => s.sims?.length && (!prefixes.length || prefixes.some((p) => s.id.startsWith(p))));

let tried = 0, failed = 0;
for (const sit of sits) {
  const fails: string[] = [];
  for (const sim of sit.sims!) for (const seed of seeds) {
    const base = playSim(sit, sim, seed);
    if (!base.conv.completed) continue; // the sim itself doesn't finish on this seed: nothing to compare
    sim.turns.forEach((turn, i) => {
      const said = base.turns.find((t) => !t.auto && t.say === turn);
      if (!said || !said.out.understood) return;
      const seen = new Set<string>([turn]);
      for (const [kind, f] of Object.entries(VARIANTS)) {
        const v = f(turn);
        if (!v || seen.has(v)) continue;
        seen.add(v);
        tried++;
        const run = playSim(sit, { ...sim, turns: sim.turns.map((t, k) => (k === i ? v : t)) }, seed);
        const t = run.turns.find((x) => !x.auto && x.say === v);
        const problem = !t ? null : !t.out.understood ? "not understood" : !run.conv.completed ? "derailed" : null;
        if (problem) { failed++; fails.push(`  [${kind}] ${problem} (${sim.name}, seed ${seed}, at ${t!.waiting}): “${v}”  (was “${turn}”)`); }
      }
    });
  }
  console.log(`${sit.id.padEnd(22)} ${fails.length} problem${fails.length === 1 ? "" : "s"}`);
  for (const f of [...new Set(fails)]) console.log(f);
}
console.log(`\n${tried} changed turns tried, ${failed} problems`);
