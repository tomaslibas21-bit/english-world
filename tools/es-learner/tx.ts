// Chunked translation of a work file (docs/es/LEARNER-LT.md), so a translator never handles the whole file:
//   npx tsx tools/es-learner/tx.ts show <sit> [<from>] [<n>=40]   the items from <from> (compact, with their index)
//   npx tsx tools/es-learner/tx.ts put <sit> <from> <answers.json>  a JSON array of `lt` values for items <from>…
//   npx tsx tools/es-learner/tx.ts next <sit>                       the first item without an answer, and the count
//   npx tsx tools/es-learner/tx.ts refresh <sit>                    after a new extract: keep the answers that still fit
// Answers go into ~/puerto-colibri-lt/done/<sit>.json (made from the work file the first time).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [cmd, sit, a, b] = process.argv.slice(2);
const BASE = path.join(os.homedir(), "puerto-colibri-lt");
const workFile = path.join(BASE, "work", sit + ".json");
const doneFile = path.join(BASE, "done", sit + ".json");
fs.mkdirSync(path.dirname(doneFile), { recursive: true });
const load = () => JSON.parse(fs.readFileSync(fs.existsSync(doneFile) ? doneFile : workFile, "utf8"));
const empty = (lt: unknown) => lt === undefined || lt === "" || (typeof lt === "object" && lt !== null && !Object.keys(lt).length);

if (cmd === "show") {
  const d = load();
  const from = Number(a ?? 0), n = Number(b ?? 40);
  d.items.slice(from, from + n).forEach((it: any, i: number) => {
    const { lt, where, ...rest } = it;
    console.log(JSON.stringify({ i: from + i, ...rest, ...(where ? { where } : {}) }));
  });
  console.log(`(${d.items.length} items in ${sit})`);
} else if (cmd === "put") {
  const d = load();
  const from = Number(a);
  const answers = JSON.parse(fs.readFileSync(b, "utf8"));
  if (!Array.isArray(answers)) throw new Error("answers must be a JSON array of lt values, in item order");
  answers.forEach((lt, i) => { if (d.items[from + i]) d.items[from + i].lt = lt; });
  fs.writeFileSync(doneFile, JSON.stringify(d, null, 1));
  const left = d.items.filter((it: any) => empty(it.lt)).length;
  console.log(`items ${from}–${from + answers.length - 1} saved; ${left} of ${d.items.length} left`);
} else if (cmd === "next") {
  const d = load();
  const i = d.items.findIndex((it: any) => empty(it.lt));
  console.log(i < 0 ? `all ${d.items.length} done` : `next: ${i} (${d.items.filter((it: any) => empty(it.lt)).length} of ${d.items.length} left)`);
} else if (cmd === "refresh") {
  // after the conversation changed and was extracted again: the new work file, with every answer that still fits
  const work = JSON.parse(fs.readFileSync(workFile, "utf8"));
  const key = (it: any) => JSON.stringify([it.kind, it.key ?? it.es ?? "", it.gloss ?? it.en ?? "", it.nat ?? ""]);
  const old = new Map<string, unknown>();
  if (fs.existsSync(doneFile)) for (const it of JSON.parse(fs.readFileSync(doneFile, "utf8")).items) if (!empty(it.lt)) old.set(key(it), it.lt);
  let kept = 0;
  for (const it of work.items) { const lt = old.get(key(it)); if (lt !== undefined) { it.lt = lt; kept++; } else it.lt = ""; }
  fs.writeFileSync(doneFile, JSON.stringify(work, null, 1));
  console.log(`${sit}: ${kept} answers kept, ${work.items.length - kept} to translate (\`next\` shows the first)`);
} else {
  console.log("commands: show, put, next, refresh");
}
