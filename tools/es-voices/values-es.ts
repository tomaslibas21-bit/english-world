// Which values each line with a value list ({$price}, {$total}…) is really said with: random conversations and the
// scripted sims, many of them, recording every value a line gets, and whether reach-es.ts lets each of them through
// (a value said here and cut there would be a clip the game misses). A check on the cuts; it proves nothing alone.
//   EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/values-es.ts [s31 s73 …] [--runs=150] [--out=<json>]
import fs from "node:fs";
import { SITUATIONS } from "../../src/content/situations";
import { placeholders } from "../../src/convo/compose";
import type { EntityDef, SituationDef } from "../../src/content/types";
import { fuzzSituation } from "../enumerate";
import { playSim } from "../sim-play";
import { reachFilter } from "./reach-es";

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const only = args.filter((a) => !a.startsWith("--"));
const runs = Number(flag("runs") ?? 150);
const lookFor = (sit: SituationDef) => (id: string): EntityDef | undefined => {
  for (const l of Object.values(sit.entities || {})) { const e = l.find((x) => x.id === id); if (e) return e; }
  return undefined;
};
const out: Record<string, { uses: number; values: Record<string, number>; cut: string[] }> = {};
let missed = 0;
for (const sit of SITUATIONS.filter((s) => !only.length || only.some((o) => s.id.startsWith(o)))) {
  const valueLines = new Map<string, string[]>();
  for (const [lid, variants] of Object.entries(sit.lines)) {
    const names = [...new Set(variants.flatMap((v) => placeholders(v).values))].filter((v) => sit.domains?.[v]);
    if (names.length && !variants.some((v) => placeholders(v).entities.length)) valueLines.set(lid, names);
  }
  if (!valueLines.size) continue;
  const take = (lineId: string, vars: Record<string, unknown> | undefined) => {
    const names = valueLines.get(lineId);
    if (!names) return;
    const k = `${sit.id}:${lineId}`;
    const r = (out[k] ??= { uses: 0, values: {}, cut: [] });
    r.uses++;
    const b = Object.fromEntries(names.map((n) => [n, vars?.[n] ?? null]));
    const v = JSON.stringify(b);
    if (!r.values[v]) {
      const f = reachFilter(sit, lineId);
      // a value outside the list itself is never voiced anyway; only one the list has and the cut drops matters
      const inLists = names.every((n) => sit.domains![n]().some((d) => JSON.stringify(d) === JSON.stringify(b[n])));
      if (f && inLists && !f(b)) { r.cut.push(v); missed++; }
    }
    r.values[v] = (r.values[v] ?? 0) + 1;
  };
  fuzzSituation(sit, lookFor(sit), runs, (_v, _s, _sent, line) => { if (line) take(line.lineId, line.vars); });
  for (const sim of sit.sims ?? []) for (const [k, g] of (["m", "f"] as const).entries()) for (const seed of [1, 2, 3]) {
    try { playSim(sit, sim, seed + k * 10, { gender: g, onTurn: (_c, _t, o) => { for (const l of o.lines) take(l.lineId, l.vars); } }); } catch { /* a sim that fails is reported by check-content */ }
  }
  process.stdout.write(`\r${sit.id}`.padEnd(40));
}
if (flag("out")) fs.writeFileSync(flag("out")!, JSON.stringify(out, null, 1));
console.log();
for (const [k, r] of Object.entries(out).sort((a, b) => Object.keys(a[1].values).length - Object.keys(b[1].values).length)) {
  const vals = Object.keys(r.values);
  console.log(`${k.padEnd(42)} ${String(r.uses).padStart(6)} uses  ${String(vals.length).padStart(4)} values${r.cut.length ? `  CUT BUT SAID: ${r.cut.slice(0, 4).join(" ")}` : ""}`);
}
console.log(missed ? `${missed} values said in these conversations are cut by reach-es.ts: fix the rules` : "every value said in these conversations is kept by reach-es.ts");
