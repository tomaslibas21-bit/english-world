// Before any voicing (owner, 18 Nov 2026): which lines simulated play never reaches (the random runs and every sim,
// tools/enumerate.ts), whether any code names them (tools/line-reach.ts), and which item lines get no static fill.
// voice-batch.ts writes the same report whenever it lists the lines; this runs it alone.
//   npx tsx tools/reach.ts [s35 s87 …] [--json=<file>] [--manifest=<file>]   (--manifest: count clips of unreached lines)
import fs from "node:fs";
import { enumerateAll, reachReport } from "./enumerate";

const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith("--"));
const flag = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const { utts, unreached, unfilled } = enumerateAll({ v2: true, fuzzRuns: 120, only, log: (s) => process.stdout.write("\r" + s.padEnd(70)) });
process.stdout.write("\n");
console.log(reachReport(unreached, unfilled));
if (flag("json")) fs.writeFileSync(flag("json")!, JSON.stringify({ unreached, unfilled }, null, 1));
const mf = flag("manifest");
if (mf) {
  const { audioKey } = await import("../src/audio-key");
  const manifest: Record<string, number> = JSON.parse(fs.readFileSync(mf, "utf8"));
  const deadLines = new Set(unreached.filter((u) => !u.named).map((u) => `${u.sit}:${u.line}`));
  const n = utts.filter((u) => deadLines.has(u.where.replace(/\[\d+\]$/, "")) && manifest[audioKey(u.voice, u.speed, u.say)]).length;
  console.log(`${n} clips in ${mf} belong to lines no code names`);
}
