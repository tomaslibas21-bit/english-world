// Checks the translators' done files (~/puerto-colibri-lt/done/<sit>.json, docs/es/LEARNER-LT.md) and writes the
// tables the game loads: src/editions/es-lt/tables/<sit>.json (and tables.gen.ts, which imports them). Prints every problem; a file with errors is not written.
//   npx tsx tools/es-learner/build.ts [sit…] [--done=<dir>] [--warn]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { sentKey, type LearnerTable } from "../../src/editions/es/learner/walk";

const flag = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");
const DONE = flag("done") ?? path.join(os.homedir(), "puerto-colibri-lt", "done");
const WORK = path.join(os.homedir(), "puerto-colibri-lt", "work");
const OUT = path.resolve(import.meta.dirname, "../../src/editions/es-lt/tables");
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const showWarn = process.argv.includes("--warn");
fs.mkdirSync(OUT, { recursive: true });

const units = (s: string) => s.split(" | ").length;
/** Both resolutions of every choice ({m:a|f:b}, {u:a|t:b}, {j:a|t:b}, {sm:a|sf:b}): the unit count must hold in each. */
const resolutions = (s: string) => [0, 1].map((i) => s.replace(/\{(m|sm|u|j):([^|{}]*)\|(f|sf|t):([^{}]*)\}/g, (_m, _a, a, _b, b) => (i ? b : a)));
const entityPh = (s: string) => [...s.matchAll(/\{([A-Z])(?:\.(np|the|pl))?(?::(?:nom|gen|dat|acc|ins|loc))?(?::pl)?\}/g)].map((m) => m[1]).sort().join(",");
const valuePh = (s: string) => [...s.matchAll(/\{\$(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const LT_CASED = /\{[A-Z](?:\.(?:np|pl))?:(?:nom|gen|dat|acc|ins|loc)(?::pl)?\}/;
const LT_BARE = /\{[A-Z](?:\.(?:np|the|pl))?\}/;
const ENGLISHY = /\b(the|and|you|your|with|is|are|it's|I'm|don't|please|thank)\b/i;
const LOWER_JUS = /(^|[^„"])\b(jūs|jus|jums|jūsų)\b/;

let wrote = 0, bad = 0;
const files = fs.existsSync(DONE) ? fs.readdirSync(DONE).filter((f) => f.endsWith(".json") && (!only.length || only.some((o) => f.startsWith(o)))) : [];
for (const f of files.sort()) {
  const sit = f.replace(/\.json$/, "");
  const done = JSON.parse(fs.readFileSync(path.join(DONE, f), "utf8"));
  const work = fs.existsSync(path.join(WORK, f)) ? JSON.parse(fs.readFileSync(path.join(WORK, f), "utf8")) : done;
  const errors: string[] = [], warns: string[] = [];
  const table: LearnerTable = { sent: {}, entity: {}, text: {} };
  const byId = new Map<string, any>();
  for (const it of done.items) byId.set(JSON.stringify([it.kind, it.key ?? it.es ?? "", it.gloss ?? it.en ?? "", it.nat ?? ""]), it);
  for (const w of work.items) {
    const it = byId.get(JSON.stringify([w.kind, w.key ?? w.es ?? "", w.gloss ?? w.en ?? "", w.nat ?? ""]));
    const lt = it?.lt;
    const label = w.kind === "entity" ? w.key : w.kind === "sent" ? w.es : w.en;
    if (lt === undefined || lt === "" || (typeof lt === "object" && !Object.keys(lt).length)) { errors.push(`missing: ${w.kind} ${label}`); continue; }
    if (w.kind === "text") {
      if (typeof lt !== "string") { errors.push(`text must be a string: ${label}`); continue; }
      if (ENGLISHY.test(lt) && lt === w.en) warns.push(`untranslated? ${lt}`);
      if (LOWER_JUS.test(lt)) warns.push(`lowercase jūs (one person = Jūs)? ${lt}`);
      table.text[w.en] = lt;
    } else if (w.kind === "sent") {
      if (typeof lt !== "object" || typeof lt.gloss !== "string" || typeof lt.nat !== "string") { errors.push(`sent needs {gloss, nat}: ${label}`); continue; }
      for (const r of resolutions(w.es)) {
        const n = units(r);
        for (const g of resolutions(lt.gloss)) if (units(g) !== n) { errors.push(`units ${units(g)} ≠ ${n}: ${w.es}  ⟶  ${lt.gloss}`); break; }
      }
      if (entityPh(w.es) !== entityPh(lt.gloss)) errors.push(`entity placeholders differ (${entityPh(w.es)} / ${entityPh(lt.gloss)}): ${lt.gloss}`);
      if (LT_BARE.test(lt.gloss) || LT_BARE.test(lt.nat)) errors.push(`placeholder without a case: ${lt.gloss} ‖ ${lt.nat}`);
      if (valuePh(w.es) !== valuePh(lt.gloss)) errors.push(`value placeholders differ in the gloss: ${lt.gloss}`);
      if (valuePh(w.nat) !== valuePh(lt.nat)) warns.push(`value placeholders differ in nat: ${lt.nat}`);
      if (entityPh(w.nat) && !LT_CASED.test(lt.nat)) warns.push(`nat lost its entity: ${lt.nat}`);
      if (/\{u:/.test(lt.gloss + lt.nat)) errors.push(`{u:…} is Spanish; Lithuanian writes {j:Jūs|t:tu}: ${lt.gloss}`);
      if (LOWER_JUS.test(lt.nat) && !/\{j:/.test(lt.nat)) warns.push(`lowercase jūs (one person = Jūs)? ${lt.nat}`);
      if (w.flags) {
        const want = Object.keys(w.flags).sort().join(","), got = Object.keys(lt.flags ?? {}).sort().join(",");
        if (want !== got) warns.push(`flags ${got || "none"} ≠ ${want}: ${w.es}`);
      }
      table.sent[sentKey(w.es, w.gloss, w.nat)] = { gloss: lt.gloss, nat: lt.nat, ...(w.flags ? { flags: lt.flags ?? {} } : {}) };
    } else {
      if (typeof lt !== "object" || typeof lt.lt !== "string" || !["m", "f"].includes(lt.g)) { errors.push(`entity needs {lt, g}: ${label}`); continue; }
      if (units(lt.lt) !== units(w.es)) errors.push(`entity units ${units(lt.lt)} ≠ ${units(w.es)}: ${w.key} ${lt.lt}`);
      if (w.esPl && lt.ltPl && units(lt.ltPl) !== units(w.esPl)) errors.push(`entity plural units: ${w.key} ${lt.ltPl}`);
      for (const u of lt.lt.split(" | ")) { const n = u.split("/").length; if (n !== 1 && n !== 6) errors.push(`a unit needs 1 or 6 forms: ${w.key} "${u}"`); }
      for (const k of Object.keys(w.fields ?? {})) if (lt[k] === undefined && k !== "lt" && k !== "nat" && k !== "natPl") (/^(neutral|spain)Lt/.test(k) ? errors : warns).push(`entity ${w.key}: no ${k}`);
      if (w.esPl && !lt.ltPl) errors.push(`entity ${w.key}: no ltPl (the Spanish has a plural)`);
      for (const k of ["nat", "natPl"]) if (lt[k] && lt[k].split("/").length !== 6 && lt[k].includes("/")) errors.push(`entity ${w.key}: ${k} needs six case forms or none`);
      if (lt.ltPl) for (const u of lt.ltPl.split(" | ")) { const n = u.split("/").length; if (n !== 1 && n !== 6) errors.push(`a plural unit needs 1 or 6 forms: ${w.key} "${u}"`); }
      table.entity[w.key] = lt;
    }
  }
  for (const e of errors.slice(0, 60)) console.log(`  ✗ ${sit}: ${e}`);
  if (errors.length > 60) console.log(`  … ${errors.length - 60} more errors in ${sit}`);
  if (showWarn) for (const w of warns.slice(0, 40)) console.log(`  ! ${sit}: ${w}`);
  if (errors.length) { bad++; continue; }
  fs.writeFileSync(path.join(OUT, sit + ".json"), JSON.stringify(table));
  wrote++;
  console.log(`✓ ${sit}: ${Object.keys(table.sent).length} sentences, ${Object.keys(table.entity).length} entities, ${Object.keys(table.text).length} texts${warns.length ? `, ${warns.length} warnings` : ""}`);
}
// the module the game imports: every table there is (src/editions/es-lt/content/situations/index.ts)
const all = fs.readdirSync(OUT).filter((f) => f.endsWith(".json")).sort();
const id = (f: string) => "T_" + f.replace(/\.json$/, "").replace(/\W/g, "_");
fs.writeFileSync(path.join(OUT, "tables.gen.ts"), `// Generated by tools/es-learner/build.ts: the Lithuanian tables (docs/es/LEARNER-LT.md).\nimport type { LearnerTable } from "../../es/learner/walk";\n${all.map((f) => `import ${id(f)} from "./${f}";`).join("\n")}\n\nexport const TABLES: Record<string, LearnerTable> = {\n${all.map((f) => `  ${JSON.stringify(f.replace(/\.json$/, ""))}: ${id(f)} as LearnerTable,`).join("\n")}\n};\n`);
console.log(`${wrote} tables written, ${bad} with errors (${all.length} in ${path.relative(process.cwd(), OUT)})`);
if (bad) process.exitCode = 1;
