// Coverage of learner sentences: how many realistic answers does the grammar accept, and does it
// understand them correctly? Corpus files: tests/corpus/<situation>.json (or --dir=…), each
//   { "situation": "s72-cafe", "items": [ { "ctx": "size", "say": "Big one please", "intent": "size_ans" }, … ] }
// `ctx` is a step or pending-question id from tools/contexts.ts; `intent` is the intent that should be
// understood (a list = any of them), "yn:yes" / "yn:no" for a bare yes/no, "none" = must NOT be accepted,
// or "any" with "not": [...] = whatever happens, it must never be understood as one of those (meaning flips).
// Optional: "slots" (partial match on the matching segment), "not" (intents that must not appear).
// Usage: npx tsx tools/coverage.ts [situation-prefix ...] [--dir=tests/corpus] [--fails] [--json=out.json]
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SITUATIONS } from "../src/content/situations";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { buildNlu } from "../src/convo/dialogue";
import { setKnownNames } from "../src/convo/slots";
import { situationContexts } from "./contexts";

// corpus sentences use this learner (as the game registers the player's own name)
setKnownNames(["Tomas", "Mikalauskas"]);

interface Item { ctx?: string; say: string; intent: string | string[]; slots?: Record<string, unknown>; not?: string[]; note?: string }
interface Corpus { situation: string; items: Item[] }

const args = process.argv.slice(2);
const dir = args.find((a) => a.startsWith("--dir="))?.slice(6) ?? "tests/corpus";
const showFails = args.includes("--fails");
const jsonOut = args.find((a) => a.startsWith("--json="))?.slice(7);
const half = args.find((a) => a.startsWith("--half="))?.slice(7); // "odd" | "even": split a blind set into diagnosis / report halves
const filters = args.filter((a) => !a.startsWith("--"));

function deepPartial(actual: any, exp: any): boolean {
  if (exp && typeof exp === "object" && !Array.isArray(exp)) {
    if (!actual || typeof actual !== "object") return false;
    return Object.entries(exp).every(([k, v]) => deepPartial(actual[k], v));
  }
  return actual === exp;
}

const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
const results: Record<string, { total: number; ok: number; rejected: number; wrong: number; falseAccept: number; negatives: number; fails: string[] }> = {};
const outcomes: Record<string, string> = {}; // "<situation>#<index>" → ok | rejected | wrong | safe | falseAccept
let T = 0, OK = 0, REJ = 0, WRONG = 0, NEG = 0, FA = 0;

for (const f of files.sort()) {
  const corpus = JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Corpus;
  if (filters.length && !filters.some((x) => corpus.situation.startsWith(x))) continue;
  const sit = SITUATIONS.find((s) => s.id === corpus.situation);
  if (!sit) { console.log(`? ${f}: unknown situation ${corpus.situation}`); continue; }
  // (an older engine without NPC names simply ignores the third argument)
  const nlu = buildNlu(sit, GLOBAL, NPCS);
  const { contexts } = situationContexts(sit);
  const r = results[sit.id] = { total: 0, ok: 0, rejected: 0, wrong: 0, falseAccept: 0, negatives: 0, fails: [] as string[] };
  for (const [idx, it] of corpus.items.entries()) {
    if (half && (idx % 2 === 1) !== (half === "odd")) continue;
    const cx = it.ctx ? contexts[it.ctx] : undefined;
    const expected = cx?.expects ?? [];
    const res = nlu.parse(it.say, expected);
    const want = Array.isArray(it.intent) ? it.intent : [it.intent];
    const got = res.best ? [...res.best.segments.map((s) => s.intent), ...(res.best.yn ? ["yn:" + res.best.yn] : [])] : [];
    const gotStr = res.ok ? got.join("+") || "?" : "—";
    if (want.includes("any")) {
      // safety item: any reaction is fine (including not understood) except the forbidden intents
      r.negatives++; NEG++;
      if (res.ok && it.not?.some((n) => got.includes(n))) { r.falseAccept++; FA++; outcomes[`${sit.id}#${idx}`] = "falseAccept"; r.fails.push(`[${it.ctx ?? "-"}] "${it.say}" must never mean ${it.not!.join("/")}, got ${gotStr}`); }
      else outcomes[`${sit.id}#${idx}`] = "safe";
      continue;
    }
    if (want.includes("none")) {
      r.negatives++; NEG++;
      if (res.ok) { r.falseAccept++; FA++; outcomes[`${sit.id}#${idx}`] = "falseAccept"; r.fails.push(`[${it.ctx ?? "-"}] "${it.say}" should NOT be accepted, got ${gotStr}`); }
      else outcomes[`${sit.id}#${idx}`] = "safe";
      continue;
    }
    r.total++; T++;
    let good = false;
    if (res.ok && res.best) {
      for (const w of want) {
        if (w.startsWith("yn:")) { if (res.best.yn === w.slice(3)) good = true; continue; }
        const seg = res.best.segments.find((s) => s.intent === w);
        if (seg && (!it.slots || deepPartial(seg.slots, it.slots))) good = true;
      }
      if (good && it.not?.some((n) => got.includes(n))) good = false;
    }
    outcomes[`${sit.id}#${idx}`] = good ? "ok" : !res.ok ? "rejected" : "wrong";
    if (good) { r.ok++; OK++; }
    else if (!res.ok) { r.rejected++; REJ++; r.fails.push(`[${it.ctx ?? "-"}] "${it.say}" → not understood (want ${want.join("/")})`); }
    else { r.wrong++; WRONG++; r.fails.push(`[${it.ctx ?? "-"}] "${it.say}" → ${gotStr}${res.best?.segments[0] ? " " + JSON.stringify(res.best.segments[0].slots) : ""} (want ${want.join("/")}${it.slots ? " " + JSON.stringify(it.slots) : ""})`); }
  }
  const pct = r.total ? Math.round((100 * r.ok) / r.total) : 0;
  console.log(`${sit.id.padEnd(20)} ${String(r.ok).padStart(4)}/${String(r.total).padEnd(4)} ${String(pct).padStart(3)}%   not understood ${r.rejected}, misunderstood ${r.wrong}${r.negatives ? `, false accepts ${r.falseAccept}/${r.negatives}` : ""}`);
  if (showFails) for (const x of r.fails) console.log("    " + x);
}
const pct = T ? ((100 * OK) / T).toFixed(1) : "0";
console.log(`\nTOTAL ${OK}/${T} understood correctly (${pct}%), not understood ${REJ}, misunderstood ${WRONG}${NEG ? `, false accepts ${FA}/${NEG}` : ""}`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ total: T, ok: OK, rejected: REJ, wrong: WRONG, negatives: NEG, falseAccepts: FA, results, outcomes }, null, 1));
