// The Lithuanian learner layer of Puerto Colibrí (docs/es/LEARNER-LT.md): writes, per conversation, every piece of
// learner-language text (English in the Spanish edition) with its Spanish context, for the translators. A translator
// fills `lt` in each item and saves the file to <done>/<sit>.json; tools/es-learner/build.ts turns the done files into
// src/editions/es-lt/tables/<sit>.json.
//   EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-learner/extract.ts [<out dir>] [sit…]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SITUATIONS } from "../../src/content/situations";
import { learnerItems, type LearnerItem } from "../../src/editions/es/learner/walk";

const out = process.argv.slice(2).find((a) => a.includes("/")) ?? path.join(os.homedir(), "puerto-colibri-lt", "work");
const only = process.argv.slice(2).filter((a) => /^[sp]\d|^_shared$/.test(a));
fs.mkdirSync(out, { recursive: true });
const ROOT = path.resolve(import.meta.dirname, "../..");
const SRC = path.join(ROOT, "src/editions/es/content/situations");

/** Learner strings the walk can't reach: `lt:` / `label:` literals inside functions (suggestions built at run time). */
function literals(file: string): string[] {
  if (!fs.existsSync(file)) return [];
  const src = fs.readFileSync(file, "utf8");
  const found = new Set<string>();
  for (const m of src.matchAll(/\b(?:lt|label)\s*:\s*"((?:[^"\\]|\\.)*)"/g)) found.add(JSON.parse(`"${m[1]}"`));
  return [...found];
}

let total = 0, chars = 0;
for (const sit of SITUATIONS as any[]) {
  if (only.length && !only.some((o) => sit.id.startsWith(o))) continue;
  const items: LearnerItem[] = learnerItems(sit);
  const have = new Set(items.filter((i) => i.kind === "text").map((i) => i.en));
  for (const s of literals(path.join(SRC, sit.id + ".ts"))) if (!have.has(s) && /[a-z]/i.test(s) && !/^[a-z_0-9]+$/.test(s)) { items.push({ kind: "text", en: s, where: "code" }); have.add(s); }
  const file = path.join(out, sit.id + ".json");
  fs.writeFileSync(file, JSON.stringify({ sit: sit.id, title: sit.title, items: items.map((i) => ({ ...i, lt: "" })) }, null, 1));
  total += items.length;
  chars += items.reduce((a, i) => a + (i.en?.length ?? 0) + Object.values(i.fields ?? {}).join("").length, 0);
}
// the town-wide text (src/editions/es/learner/shared.ts)
if (!only.length || only.includes("_shared")) {
  const { sharedContent } = await import("../../src/editions/es/learner/shared");
  const items = learnerItems(sharedContent());
  fs.writeFileSync(path.join(out, "_shared.json"), JSON.stringify({ sit: "_shared", title: { en: "Puerto Colibrí", lt: "the whole town" }, items: items.map((i) => ({ ...i, lt: "" })) }, null, 1));
  total += items.length;
}
console.log(`${total} items, ${Math.round(chars / 1000)}k chars of English → ${out}`);
