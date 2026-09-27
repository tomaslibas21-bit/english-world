// Content checker: grammar, interlinear structure, merge records, NLU tests and dialogue simulations.
// Usage: npx tsx tools/check-content.ts [situationId-prefix | file.ts ...] [--verbose] [--fuzz=N]
import { SITUATIONS as ALL } from "../src/content/situations";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { GLOBAL } from "../src/content/global";
import { NPCS } from "../src/content/npcs";
import { mergeRecord, mergeKey } from "../src/content/merges";
import { buildNlu } from "../src/convo/dialogue";
import { compose, splitUnits, placeholders } from "../src/convo/compose";
import type { EntityDef, SentSrc, SimTest, SituationDef } from "../src/content/types";
import { fuzzSituation } from "./enumerate";
import { playSim } from "./sim-play";

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const fuzzRuns = Number(args.find((a) => a.startsWith("--fuzz="))?.slice(7) ?? 80);
const filters = args.filter((a) => !a.startsWith("--"));
// Arguments may be situation ids/prefixes, song numbers or paths to situation files.
const fileArgs = filters.filter((f) => f.endsWith(".ts"));
const loaded: SituationDef[] = [];
for (const f of fileArgs) {
  const mod = await import(pathToFileURL(path.resolve(f)).href);
  const def = (mod.default ?? Object.values(mod).find((v: any) => v && v.id && v.steps)) as SituationDef;
  if (!def) { console.log(`✗ ${f}: no default export`); process.exit(1); }
  loaded.push(...(Array.isArray(def) ? def : [def]));
}
const idFilters = filters.filter((f) => !f.endsWith(".ts"));
const sits = fileArgs.length ? loaded : ALL.filter((s) => !idFilters.length || idFilters.some((f) => s.id.startsWith(f) || String(s.song) === f));
let currentSit: SituationDef | null = null;

let errors = 0, warnings = 0;
const err = (s: string) => { errors++; console.log("  ✗ " + s); };
const warn = (s: string) => { warnings++; if (verbose) console.log("  ! " + s); };
const unregistered = new Map<string, string>();

const ARTICLES = new Set(["a", "an", "the", "A", "An", "The"]);
function stripPunct(w: string) { return w.replace(/^[\s"“”'‘’(¿¡]+|[\s"“”'‘’.,!?;:)…]+$/g, ""); }

function checkUnits(where: string, s: SentSrc, look: (id: string) => EntityDef | undefined, sampleVars: Record<string, any>[]) {
  // unit counts under all address/gender choices
  for (const formal of [true, false]) for (const g of ["m", "f"] as const) for (const sp of ["m", "f"] as const) {
    let ok = false; let lastErr = "";
    for (const vars of sampleVars) {
      try { compose(s, vars, { look, addressee: g, speaker: sp, formal }); ok = true; break; } catch (e: any) { lastErr = e.message; }
    }
    if (!ok) { err(`${where}: ${lastErr}`); return; }
  }
  const en = splitUnits(s.en), lt = splitUnits(s.lt);
  en.forEach((u, i) => {
    if (u.includes("{")) return;
    const w = stripPunct(u);
    if (ARTICLES.has(w) && !/^—/.test(lt[i] ?? "") && !(lt[i] || "").startsWith("{") && !s.flags?.[i]) warn(`${where}: article "${u}" glossed "${lt[i]}" (expected —)`);
    if (/\s/.test(w) && !mergeRecord(w) && !currentSit?.merges?.[mergeKey(w)]) unregistered.set(mergeKey(w), (currentSit?.id ?? "") + " " + where);
  });
  if (/\d|\$/.test(s.en.replace(/\{\$[a-z]+\}/gi, "")) && !s.say) warn(`${where}: digits without a spoken form (say)`);
}

function sampleVarsFor(s: SentSrc, sit: SituationDef): Record<string, any>[] {
  const ph = placeholders(s);
  const types = Object.values(sit.entities || {});
  const out: Record<string, any>[] = [];
  const base: Record<string, any> = { price: 450, total: 1250, amount: 2000, time: { h: 10, m: 30 }, letters: "latte", num: 3, name: "Tomas", text: "text" };
  if (!ph.entities.length) return [base];
  for (const list of types) {
    if (!list.length) continue;
    const v: Record<string, any> = { ...base };
    for (const name of ph.entities) v[name] = list[0].id;
    out.push(v);
  }
  return out.length ? out : [base];
}

for (const sit of sits) {
  currentSit = sit;
  console.log(`\n■ ${sit.id} — ${sit.title.en} (song ${sit.song})`);
  const look = (id: string) => {
    for (const list of Object.values(sit.entities || {})) { const e = list.find((x) => x.id === id); if (e) return e; }
    return GLOBAL.entities.find((x) => x.id === id);
  };
  // NPCs
  for (const id of [sit.npc, ...(sit.npcs || [])]) if (!NPCS[id]) err(`unknown npc ${id}`);
  // grammar
  let nlu;
  try { nlu = buildNlu(sit, GLOBAL, NPCS); for (const e of nlu.validate()) err(e); } catch (e: any) { err(`grammar: ${e.message}`); continue; }
  // lines
  for (const [id, vars] of Object.entries(sit.lines)) vars.forEach((s, i) => checkUnits(`line ${id}[${i}]`, s, look, sampleVarsFor(s, sit)));
  // hints
  for (const [gid, g] of Object.entries(sit.hints)) {
    const ents = g.slot ? sit.entities?.[g.slot] || [] : [];
    if (g.slot && !ents.length) err(`hint ${gid}: unknown slot type ${g.slot}`);
    for (const it of g.items) {
      const where = `hint ${gid}.${it.id}`;
      const usable = ents.filter((e) => !it.only || it.only(e));
      const samples = usable.length ? usable.map((e) => ({ X: e.id, name: "Tomas" })) : [{ name: "Tomas" }];
      checkUnits(where, it.s, look, samples);
      if (usable.length) for (const e of usable) {
        try { compose(it.s, { X: e.id, name: "Tomas" }, { look }); } catch (x: any) { err(`${where} with ${e.id}: ${x.message}`); }
      }
    }
  }
  // steps reference hints/intents
  for (const st of sit.steps) {
    for (const i of st.expects || []) if (!sit.intents[i] && !GLOBAL.intents[i]) err(`step ${st.id}: unknown intent ${i}`);
    for (const sg of st.suggest || []) if (sg.hint && !sit.hints[sg.hint] && !GLOBAL.hints[sg.hint]) err(`step ${st.id}: unknown hint group ${sg.hint}`);
  }
  for (const h of Object.keys(sit.handlers)) if (!sit.intents[h] && !GLOBAL.intents[h]) err(`handler ${h} has no intent`);
  for (const i of Object.keys(sit.intents)) if (!sit.handlers[i] && !GLOBAL.handlers[i]) warn(`intent ${i} has no handler`);

  // NLU tests
  let pass = 0;
  for (const t of sit.tests || []) {
    const st = t.step ? sit.steps.find((x) => x.id === t.step) : undefined;
    const expected = [...(st?.expects || []), ...(t.step ? [`${t.step}_ctx`, t.intent] : [])].filter((x) => t.step || x !== t.intent);
    const res = nlu.parse(t.say, t.step ? [...(st?.expects || []), ...Object.keys(sit.intents).filter((k) => k.endsWith("_ctx") && (st?.expects || []).includes(k))] : []);
    const got = res.best?.segments[0]?.intent ?? (res.best?.yn ? "yn:" + res.best.yn : "none");
    let ok = t.intent === "none" ? !res.ok : got === t.intent;
    if (ok && t.slots) {
      const slots = res.best!.segments[0].slots;
      for (const [k, v] of Object.entries(t.slots)) if (!deepPartial(slots[k], v)) { ok = false; break; }
    }
    if (ok && t.not) for (const n of t.not) if (res.best?.segments.some((s) => s.intent === n)) ok = false;
    if (ok) pass++;
    else err(`test "${t.say}"${t.step ? ` @${t.step}` : ""}: expected ${t.intent}${t.slots ? " " + JSON.stringify(t.slots) : ""}, got ${got} ${res.best ? JSON.stringify(res.best.segments.map((s) => ({ i: s.intent, s: s.slots }))) : ""}`);
    void expected;
  }
  if (sit.tests?.length) console.log(`  NLU tests: ${pass}/${sit.tests.length}`);

  // simulations (several seeds), played as in tools/sim-play.ts
  for (const sim of sit.sims || []) {
    let okSeeds = 0; const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const fails: string[] = [];
    const unused: string[] = [];
    const stuckAt = new Map<string, number>();
    const unclear = new Map<string, number[]>();
    const misplaced = new Map<string, number[]>();
    for (const seed of seeds) {
      const r = simulate(sit, sim, seed);
      // a completed conversation must have its whole checklist ticked (the checklist = what the task needs)
      const open = r.completed ? r.openAtCompletion : [];
      // `expect.state`: values the situation's state must have at the end
      const badState = sim.expect.state && !deepPartial(r.conv.s, sim.expect.state);
      if ((sim.expect.complete ?? true) === r.completed && !open.length && !badState) okSeeds++;
      else if (open.length) fails.push(`seed ${seed}: completed, but the checklist still shows ${open.map((x) => `„${x}“`).join(", ")}`);
      else if (badState && (sim.expect.complete ?? true) === r.completed) fails.push(`seed ${seed}: the state doesn't match expect.state ${JSON.stringify(sim.expect.state)}`);
      else fails.push(`seed ${seed}: ${r.log.slice(-8).join(" / ")}`);
      if (r.unused) {
        unused.push(`${seed}${r.unused > 1 ? ` (${r.unused})` : ""}`);
        stuckAt.set(r.firstUnused!, (stuckAt.get(r.firstUnused!) ?? 0) + 1);
      }
      for (const t of r.unclear) { if (!unclear.has(t)) unclear.set(t, []); unclear.get(t)!.push(seed); }
      for (const t of r.misplaced) { if (!misplaced.has(t)) misplaced.set(t, []); misplaced.get(t)!.push(seed); }
    }
    if (okSeeds === seeds.length) console.log(`  sim "${sim.name}": ${okSeeds}/${seeds.length} seeds ✓`);
    else { err(`sim "${sim.name}": ${okSeeds}/${seeds.length} seeds`); for (const f of fails.slice(0, 3)) console.log("      " + f); }
    // the conversation ended before the script did: those turns were never tested
    if (unused.length) {
      warnings++;
      const first = [...stuckAt].sort((a, b) => b[1] - a[1])[0][0];
      console.log(`  ! sim "${sim.name}": scripted turns never said on seed${unused.length > 1 ? "s" : ""} ${unused.join(", ")} (of ${sim.turns.length} turns); the first one never said: "${first}"`);
    }
    // a turn that waited for a moment that never came, said at last somewhere else: the script is out of step
    if (misplaced.size) {
      warnings++;
      console.log(`  ! sim "${sim.name}": scripted turns said out of place (their moment never came): ${[...misplaced].map(([t, sd]) => `"${t}" (seed${sd.length > 1 ? "s" : ""} ${sd.join(", ")})`).join("; ")}`);
    }
    // a scripted turn the person didn't understand wasn't tested either
    if (unclear.size) {
      warnings++;
      console.log(`  ! sim "${sim.name}": scripted turns not understood: ${[...unclear].map(([t, sd]) => `"${t}" (seed${sd.length > 1 ? "s" : ""} ${sd.join(", ")})`).join("; ")}`);
    }
  }

  // random-order conversations must never crash a handler
  const crashes = fuzzSituation(sit, look, fuzzRuns);
  if (crashes.length) { err(`${crashes.length} crashes in ${fuzzRuns} random-order conversations`); for (const c of [...new Set(crashes)].slice(0, 3)) console.log("      " + c); }
  else console.log(`  fuzz: ${fuzzRuns} random-order conversations, no crashes ✓`);
}

function deepPartial(actual: any, exp: any): boolean {
  if (exp && typeof exp === "object" && !Array.isArray(exp)) {
    if (!actual || typeof actual !== "object") return false;
    return Object.entries(exp).every(([k, v]) => deepPartial(actual[k], v));
  }
  return actual === exp;
}

export function simulate(sit: SituationDef, sim: SimTest, seed: number) {
  const log: string[] = [];
  const r = playSim(sit, sim, seed, {
    onTurn: (_conv, t, out) => {
      if (t) log.push(`YOU${t.auto ? " (auto)" : ""}: ${t.say}${out.understood ? "" : " (not understood)"}`);
      log.push("NPC: " + out.lines.map((l) => l.sentence.en).join(" "));
    },
  });
  if (verbose) console.log("    " + log.join("\n    "));
  const unclear = r.turns.filter((t) => !t.auto && !t.out.understood).map((t) => t.say);
  return { completed: r.conv.completed, log, conv: r.conv, openAtCompletion: r.openAtCompletion, unused: r.unused, firstUnused: r.firstUnused, unclear, misplaced: r.misplaced };
}

if (unregistered.size) {
  console.log(`\nUnregistered multiword units (${unregistered.size}):`);
  for (const [k, w] of unregistered) console.log(`  "${k}"  (${w})`);
  errors += unregistered.size;
}
console.log(`\n${errors ? "✗" : "✓"} ${errors} errors, ${warnings} warnings${verbose ? "" : " (use --verbose to list warnings)"}`);
process.exit(errors ? 1 : 0);
