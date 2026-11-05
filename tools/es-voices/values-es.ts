// Which values each line with a value list ({$price}, {$total}…) is really said with: random runs, the scripted sims and
// the probes (runs-es.ts), many of them, recording every value a line gets, whether reach-es.ts lets each of them
// through (a value said here and cut there would be a clip the game misses) and, with a line list, whether its clip is
// in the list in both Spanishes. A check on the cuts; it proves nothing alone.
//   EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/values-es.ts [s31 s73 …] [--runs=150]
//     [--first=1000] [--lines=<lines.json>] [--out=<json>]
import fs from "node:fs";
import { SITUATIONS } from "../../src/content/situations";
import { GLOBAL } from "../../src/content/global";
import { NPCS } from "../../src/content/npcs";
import { npcVoice } from "../../src/content/voices";
import { withoutAddressedNames } from "../../src/audio-key";
import { compose, placeholders, setVariety } from "../../src/convo/compose";
import { EDITION } from "../../src/edition";
import { lookFor, observe } from "./runs-es";
import { reachFilter } from "./reach-es";

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const only = args.filter((a) => !a.startsWith("--"));
const runs = Number(flag("runs") ?? 150), first = Number(flag("first") ?? 0);
const NAMES = [EDITION.simPlayer.name, EDITION.simPlayer.surname];
const list = flag("lines") ? new Set((JSON.parse(fs.readFileSync(flag("lines")!, "utf8")) as { voice: string; speed: number; say: string }[]).map((u) => `${u.voice}|${u.speed}|${u.say}`)) : null;
const out: Record<string, { uses: number; values: Record<string, number>; cut: string[]; notListed: string[] }> = {};
let missed = 0, unlisted = 0;
for (const sit of SITUATIONS.filter((s) => !only.length || only.some((o) => s.id.startsWith(o)))) {
  const look = lookFor(sit);
  const valueLines = new Map<string, string[]>();
  for (const [lid, variants] of Object.entries(sit.lines)) {
    const names = [...new Set(variants.flatMap((v) => placeholders(v).values))].filter((v) => sit.domains?.[v]);
    if (names.length) valueLines.set(lid, names);
  }
  if (!valueLines.size) continue;
  observe(sit, {
    fuzzRuns: runs, firstRun: first, simSeeds: (g) => [1, 2, 3].map((s) => s + (g === "f" ? 10 : 0)),
    onLine: ({ line, gender }) => {
      const names = valueLines.get(line.lineId);
      if (!names) return;
      const k = `${sit.id}:${line.lineId}`;
      const r = (out[k] ??= { uses: 0, values: {}, cut: [], notListed: [] });
      r.uses++;
      const b = Object.fromEntries(names.map((n) => [n, line.vars?.[n] ?? null]));
      const v = JSON.stringify(b);
      if (!r.values[v]) {
        const f = reachFilter(sit, line.lineId);
        // a value outside the list itself is never voiced anyway; only one the list has and the cut drops matters
        const inLists = names.every((n) => sit.domains![n]().some((d) => JSON.stringify(d) === JSON.stringify(b[n])));
        if (f && inLists && !f(b)) { r.cut.push(v); missed++; }
      }
      r.values[v] = (r.values[v] ?? 0) + 1;
      // the clip itself, in both Spanishes, in the list
      if (!list) return;
      const n = NPCS[line.npc];
      const src = (sit.lines[line.lineId] ?? GLOBAL.lines[line.lineId])?.[line.variant];
      for (const variety of ["default", "neutral"] as const) {
        setVariety(variety);
        try {
          const s = variety === "default" ? line.sentence : src ? compose(src, line.vars, { look, addressee: gender, speaker: n.gender ?? "f", formal: !n.informal }) : null;
          if (!s || !s.say.trim() || /\s[.,!?]/.test(s.say)) continue;
          const say = withoutAddressedNames(s.say, NAMES) ?? s.say;
          const key = `${npcVoice(n)}|${n.speed ?? 1}|${say}`;
          if (!list.has(key) && !r.notListed.includes(key)) { r.notListed.push(key); unlisted++; }
        } catch { /* the neutral twin doesn't take these vars */ } finally { setVariety("default"); }
      }
    },
  });
  process.stdout.write(`\r${sit.id}`.padEnd(40));
}
if (flag("out")) fs.writeFileSync(flag("out")!, JSON.stringify(out, null, 1));
console.log();
for (const [k, r] of Object.entries(out).sort((a, b) => Object.keys(a[1].values).length - Object.keys(b[1].values).length)) {
  const vals = Object.keys(r.values);
  console.log(`${k.padEnd(42)} ${String(r.uses).padStart(6)} uses  ${String(vals.length).padStart(4)} values${r.cut.length ? `  CUT BUT SAID: ${r.cut.slice(0, 4).join(" ")}` : ""}${r.notListed.length ? `  NOT IN THE LIST: ${r.notListed.slice(0, 3).join(" ")}` : ""}`);
}
console.log(missed ? `${missed} values said in these conversations are cut by reach-es.ts: fix the rules` : "every value said in these conversations is kept by reach-es.ts");
if (list) console.log(unlisted ? `${unlisted} clips with a value said in these conversations are not in the list` : "every clip with a value said in these conversations is in the list");
process.exit(missed || unlisted ? 1 : 0);
